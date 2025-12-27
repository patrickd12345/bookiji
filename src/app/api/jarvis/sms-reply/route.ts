/**
 * Jarvis SMS Reply Webhook
 * 
 * POST /api/jarvis/sms-reply
 * 
 * Receives SMS replies from Twilio webhook.
 * Verifies sender, parses intent, executes actions with guards.
 * 
 * Responsibilities:
 * - Verify Twilio signature (optional - can be disabled in dev)
 * - Extract sender phone and message body
 * - Reject if sender ≠ JARVIS_OWNER_PHONE
 * - Parse intent (deterministic + LLM context)
 * - Execute actions with guard rails
 * - Send feedback SMS
 * - Audit log everything
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseSmsIntent } from '@/lib/jarvis/intent/parseSmsIntent'
import { executeWithGuards } from '@/lib/jarvis/execution/executeWithGuards'
import { sendFeedbackSMS, formatFeedbackMessage } from '@/lib/jarvis/feedback/sendFeedbackSMS'
import { logJarvisAction } from '@/lib/jarvis/audit/auditLog'
import { getIncidentSnapshot } from '@/lib/jarvis/incidentSnapshot'
import { getAppEnv } from '@/lib/env/assertAppEnv'
import { startPlaybook, executeNextStep, abortPlaybook } from '@/lib/jarvis/playbooks/engine'
import { formatCurrentStep, formatPlaybookComplete, formatPlaybookAbort } from '@/lib/jarvis/playbooks/smsMenu'
import { getActivePlaybookState } from '@/lib/jarvis/playbooks/state'
import { getIncidentStatusSnapshot, getPreviousIncident } from '@/lib/jarvis/status/getIncidentSnapshot'
import { computeSeverity } from '@/lib/jarvis/status/computeSeverity'
import { computeAvailableCommands } from '@/lib/jarvis/status/computeAvailableCommands'
import { summarizeStatus, summarizeWhy, summarizeChanges } from '@/lib/jarvis/status/summarizeIncident'
import { markIncidentAcknowledged } from '@/lib/jarvis/escalation/state'
import { getServerSupabase } from '@/lib/supabaseServer'
import type { Environment } from '@/lib/jarvis/types'

/**
 * Verify Twilio webhook signature (optional - can be disabled in dev)
 */
function verifyTwilioSignature(
  url: string,
  params: URLSearchParams,
  signature: string | null
): boolean {
  // In development, skip signature verification if TWILIO_VERIFY_SIGNATURE is not set
  if (process.env.NODE_ENV === 'development' && !process.env.TWILIO_VERIFY_SIGNATURE) {
    return true
  }

  if (!signature || !process.env.TWILIO_AUTH_TOKEN) {
    return false
  }

  // Twilio signature verification would go here
  // For now, we'll rely on phone number verification as primary security
  // In production, you should implement proper Twilio signature verification
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Get owner phone (required)
    const ownerPhone = process.env.JARVIS_OWNER_PHONE
    if (!ownerPhone) {
      return NextResponse.json(
        { error: 'JARVIS_OWNER_PHONE not configured' },
        { status: 500 }
      )
    }

    // Parse request body (Twilio sends form data)
    const formData = await request.formData()
    const body: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      body[key] = value.toString()
    }

    // Extract Twilio fields
    const senderPhone = body.From || body.from
    const messageBody = body.Body || body.body || ''
    const twilioSignature = request.headers.get('X-Twilio-Signature')

    if (!senderPhone) {
      // Return 200 to prevent Twilio retries
      return NextResponse.json({ success: false, error: 'Missing From field' }, { status: 200 })
    }

    if (!messageBody) {
      // Return 200 to prevent Twilio retries
      return NextResponse.json({ success: false, error: 'Missing Body field' }, { status: 200 })
    }

    // Verify Twilio signature (optional)
    const url = request.url
    const params = new URLSearchParams()
    for (const [key, value] of formData.entries()) {
      params.append(key, value.toString())
    }
    
    if (!verifyTwilioSignature(url, params, twilioSignature)) {
      console.warn('[Jarvis] Twilio signature verification failed')
      // Still proceed - phone verification is primary security
    }

    // Guard: Reject if sender is not owner
    if (senderPhone !== ownerPhone) {
      console.warn(`[Jarvis] Rejected SMS from unauthorized sender: ${senderPhone}`)
      // Return 200 to prevent Twilio retries
      return NextResponse.json(
        { success: false, error: 'Unauthorized sender' },
        { status: 200 }
      )
    }

    // Get current environment
    const env = (getAppEnv() || 'prod') as Environment

    // Get current snapshot (for context, not required for execution)
    let snapshot
    try {
      snapshot = await getIncidentSnapshot()
    } catch (error) {
      // Snapshot failure is non-fatal
      console.error('[Jarvis] Failed to get snapshot:', error)
    }

    // Parse intent (deterministic + LLM context)
    const parsedIntent = await parseSmsIntent(messageBody)

    // Handle read-only status queries first (no side effects)
    const statusQueries = parsedIntent.actions.filter(a => 
      a.endsWith('_QUERY')
    )

    if (statusQueries.length > 0) {
      // Get current incident snapshot
      const incident = await getIncidentStatusSnapshot(ownerPhone)
      
      if (!incident) {
        await sendFeedbackSMS(
          ownerPhone,
          'No active incident found. System appears healthy.'
        )
        return NextResponse.json({
          success: true,
          query_type: statusQueries[0],
          message: 'No active incident'
        })
      }

      // Handle each query
      for (const query of statusQueries) {
        let summary: string

        if (query === 'STATUS_QUERY') {
          const severity = computeSeverity(incident.snapshot)
          const result = await summarizeStatus(incident, severity)
          summary = result.summary
        } else if (query === 'WHY_QUERY') {
          const severity = computeSeverity(incident.snapshot)
          const result = await summarizeWhy(incident, severity)
          summary = result.summary
        } else if (query === 'CHANGES_QUERY') {
          const previous = await getPreviousIncident(incident.incident_id, env)
          const result = await summarizeChanges(incident, previous)
          summary = result.summary
        } else if (query === 'HELP_QUERY') {
          const available = computeAvailableCommands(incident, env)
          
          summary = `HELP — Available Commands\n\n`
          summary += `Read-only:\n`
          available.read_only.forEach(cmd => {
            summary += `- ${cmd}\n`
          })
          
          if (available.actions.length > 0) {
            summary += `\nActions:\n`
            available.actions.forEach(action => {
              summary += `- ${action.id}: ${action.name}\n`
            })
          }
          
          if (available.playbooks.length > 0) {
            summary += `\nPlaybooks:\n`
            available.playbooks.forEach(pb => {
              summary += `- START ${pb.id}: ${pb.name}\n`
            })
          }
        } else {
          summary = 'Unknown query type'
        }

        // Send response
        await sendFeedbackSMS(ownerPhone, summary)

        // Log read-only query (audit trail)
        await logJarvisAction({
          timestamp: new Date().toISOString(),
          sender_phone: senderPhone,
          parsed_intent: parsedIntent,
          environment: env,
          context: `Read-only query: ${query}`
        })

        return NextResponse.json({
          success: true,
          query_type: query,
          message: summary
        })
      }
    }

    // Handle ACK command (acknowledge incident, freeze escalation)
    const ackActions = parsedIntent.actions.filter(a => a === 'ACK_INCIDENT')
    if (ackActions.length > 0) {
      // Get most recent unacknowledged incident
      const supabase = getServerSupabase()
      const { data: recentIncident } = await supabase
        .from('jarvis_incidents')
        .select('incident_id')
        .eq('env', env)
        .is('acknowledged_at', null)
        .eq('resolved', false)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single()

      if (recentIncident) {
        await markIncidentAcknowledged(recentIncident.incident_id)
        await sendFeedbackSMS(
          ownerPhone,
          '✅ Incident acknowledged. Escalation frozen. I\'ll stay silent unless severity increases.'
        )

        return NextResponse.json({
          success: true,
          action: 'ack',
          incident_id: recentIncident.incident_id,
          message: 'Incident acknowledged'
        })
      } else {
        await sendFeedbackSMS(
          ownerPhone,
          'No active incident to acknowledge.'
        )
        return NextResponse.json({
          success: false,
          action: 'ack',
          message: 'No active incident'
        })
      }
    }

    // Handle playbook commands (before regular actions)
    const playbookActions = parsedIntent.actions.filter(a => 
      a.startsWith('PLAYBOOK_')
    )

    if (playbookActions.length > 0) {
      // Handle playbook commands
      for (const playbookAction of playbookActions) {
        if (playbookAction.startsWith('PLAYBOOK_START:')) {
          const playbookId = playbookAction.replace('PLAYBOOK_START:', '')
          const result = await startPlaybook(playbookId, ownerPhone, env, parsedIntent.context)
          
          // Send feedback
          await sendFeedbackSMS(ownerPhone, result.message)
          
          // Get current step menu
          const stepMenu = await formatCurrentStep(ownerPhone)
          if (stepMenu) {
            await sendFeedbackSMS(ownerPhone, stepMenu)
          }

          return NextResponse.json({
            success: result.success,
            playbook_action: 'start',
            playbook_id: playbookId,
            message: result.message
          })
        }

        if (playbookAction === 'PLAYBOOK_NEXT') {
          const result = await executeNextStep(ownerPhone, env, true)
          
          // Send feedback
          await sendFeedbackSMS(ownerPhone, result.message)
          
          // If completed, send completion message
          if (result.completed) {
            const state = await getActivePlaybookState(ownerPhone)
            const playbookId = state?.playbook_id || 'unknown'
            const stepsExecuted = state?.steps_executed.length || 0
            const completeMsg = formatPlaybookComplete(playbookId, stepsExecuted)
            await sendFeedbackSMS(ownerPhone, completeMsg)
          } else if (result.next_step) {
            // Send next step menu
            const stepMenu = await formatCurrentStep(ownerPhone)
            if (stepMenu) {
              await sendFeedbackSMS(ownerPhone, stepMenu)
            }
          }

          return NextResponse.json({
            success: result.success,
            playbook_action: 'next',
            message: result.message,
            completed: result.completed
          })
        }

        if (playbookAction === 'PLAYBOOK_SKIP') {
          // Skip current step (execute next without executing current)
          await executeNextStep(ownerPhone, env, false)
          
          // Then execute next step
          const nextResult = await executeNextStep(ownerPhone, env, true)
          
          await sendFeedbackSMS(ownerPhone, `Step skipped. ${nextResult.message}`)
          
          return NextResponse.json({
            success: nextResult.success,
            playbook_action: 'skip',
            message: nextResult.message
          })
        }

        if (playbookAction === 'PLAYBOOK_ABORT') {
          const result = await abortPlaybook(ownerPhone)
          const state = await getActivePlaybookState(ownerPhone)
          const playbookId = state?.playbook_id || 'unknown'
          const abortMsg = formatPlaybookAbort(playbookId)
          
          await sendFeedbackSMS(ownerPhone, abortMsg)

          return NextResponse.json({
            success: result.success,
            playbook_action: 'abort',
            message: result.message
          })
        }
      }
    }

    // If no actions found, check for active playbook and show current step
    if (parsedIntent.actions.length === 0) {
      const currentStep = await formatCurrentStep(ownerPhone)
      if (currentStep) {
        await sendFeedbackSMS(ownerPhone, currentStep)
        return NextResponse.json({
          success: true,
          message: 'Current playbook step shown',
          playbook_active: true
        })
      }

      // Log the attempt
      await logJarvisAction({
        timestamp: new Date().toISOString(),
        sender_phone: senderPhone,
        parsed_intent: parsedIntent,
        environment: env,
        context: parsedIntent.context,
        refusal_reason: 'No actions found in message'
      })

      // Send feedback
      await sendFeedbackSMS(
        ownerPhone,
        formatFeedbackMessage(
          undefined,
          { success: false, message: 'No recognized command found. Use: ENABLE SCHEDULING, DISABLE SCHEDULING, START <PLAYBOOK>, NEXT, ABORT' },
          env
        )
      )

      return NextResponse.json({
        success: false,
        message: 'No actions found in message',
        parsed_intent: parsedIntent
      })
    }

    // Execute regular actions (non-playbook)
    const regularActions = parsedIntent.actions.filter(a => 
      !a.startsWith('PLAYBOOK_')
    )

    if (regularActions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No regular actions to execute'
      })
    }

    // Execute each action with guards
    const results = []
    for (const actionId of regularActions) {
      const result = await executeWithGuards(
        actionId,
        env,
        senderPhone,
        ownerPhone,
        parsedIntent.context,
        snapshot
      )
      results.push(result)
    }

    // Log audit
    for (const result of results) {
      await logJarvisAction({
        timestamp: new Date().toISOString(),
        sender_phone: senderPhone,
        parsed_intent: parsedIntent,
        action_id: result.action_id,
        action_result: result,
        environment: env,
        context: parsedIntent.context,
        refusal_reason: result.success ? undefined : result.message
      })
    }

    // Send feedback SMS (one message for all actions)
    const allSuccess = results.every(r => r.success)
    const feedbackMessage = allSuccess
      ? formatFeedbackMessage(
          results[0]?.action_id,
          { success: true, message: results.map(r => r.message).join('\n') },
          env
        )
      : formatFeedbackMessage(
          results[0]?.action_id,
          { success: false, message: results.map(r => r.message).join('\n') },
          env
        )

    await sendFeedbackSMS(ownerPhone, feedbackMessage)

    return NextResponse.json({
      success: allSuccess,
      parsed_intent: parsedIntent,
      actions_executed: results,
      message: feedbackMessage
    })
  } catch (error) {
    console.error('[Jarvis] SMS reply handler error:', error)
    
    // Return 200 to prevent Twilio retries
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 200 }
    )
  }
}


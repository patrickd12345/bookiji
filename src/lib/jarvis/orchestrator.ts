/**
 * Jarvis Orchestrator
 * 
 * The main brain that coordinates:
 * 1. Incident detection
 * 2. Assessment
 * 3. SMS notification
 * 4. Reply parsing
 * 5. Action execution
 */

import { getIncidentSnapshot } from './incidentSnapshot'
import { assessIncident } from './llmAssessment'
import { parseSMSReply } from './smsHandler'
import { executeAction } from './actionMatrix'
import {
  generateIncidentHash,
  wasRecentlySent,
  recordIncidentNotification,
  markIncidentReplied,
  getUnrepliedIncidents
} from './incidentState'
import { notifyWithEscalation } from './escalation/notifyWithEscalation'
import type { ParsedReply, ActionResult } from './types'

/**
 * Main Jarvis function - detect and handle incident
 */
export async function jarvisDetectAndNotify(
  ownerPhone: string
): Promise<{
  incident_id: string
  snapshot_taken: boolean
  assessment_done: boolean
  sms_sent: boolean
  duplicate_suppressed?: boolean
  error?: string
}> {
  const incidentId = `incident_${Date.now()}`

  try {
    // Step 1: Collect incident snapshot
    const snapshot = await getIncidentSnapshot()

    // Step 2: Assess with LLM
    const assessment = await assessIncident(snapshot)

    // Step 3: Check for duplicate (suppress if same incident recently sent)
    const incidentHash = generateIncidentHash(snapshot, assessment)
    const recentlySent = await wasRecentlySent(incidentHash, 45) // 45 minute window

    if (recentlySent) {
      return {
        incident_id: incidentId,
        snapshot_taken: true,
        assessment_done: true,
        sms_sent: false,
        duplicate_suppressed: true
      }
    }

    // Step 4: Record incident first (before notification, for escalation tracking)
    await recordIncidentNotification(incidentId, incidentHash, snapshot, assessment)

    // Step 5: Send SMS with escalation logic
    const escalationResult = await notifyWithEscalation(
      incidentId,
      assessment,
      snapshot,
      ownerPhone
    )

    if (!escalationResult.sent) {
      return {
        incident_id: incidentId,
        snapshot_taken: true,
        assessment_done: true,
        sms_sent: false,
        duplicate_suppressed: escalationResult.suppressed,
        error: escalationResult.reason
      }
    }

    return {
      incident_id: incidentId,
      snapshot_taken: true,
      assessment_done: true,
      sms_sent: true
    }
  } catch (error) {
    return {
      incident_id: incidentId,
      snapshot_taken: false,
      assessment_done: false,
      sms_sent: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Process SMS reply and execute actions
 */
export async function jarvisProcessReply(
  replyText: string,
  incidentId: string,
  snapshotEnv: 'prod' | 'staging' | 'local'
): Promise<{
  parsed: ParsedReply
  actions_executed: ActionResult[]
  message: string
}> {
  // Parse reply
  const parsed = await parseSMSReply(replyText)

  // Mark incident as replied
  await markIncidentReplied(incidentId)

  // Execute actions based on choices
  const actionsExecuted: ActionResult[] = []

  // Map choices to actions (simplified - in real implementation, this would be more sophisticated)
  const actionMap: Record<string, string> = {
    'A': 'capture_snapshot', // Monitor = capture snapshot
    'B': 'capture_snapshot', // Rollback = capture snapshot first
    'C': 'disable_scheduling', // Disable payments = disable scheduling
    'D': 'capture_snapshot' // Wait = capture snapshot
  }

  for (const choice of parsed.choices) {
    const actionId = actionMap[choice]
    if (actionId) {
      const result = await executeAction(actionId, snapshotEnv)
      actionsExecuted.push(result)
    }
  }

  // Build confirmation message
  let message = '✅ Jarvis received your reply.\n\n'
  
  if (actionsExecuted.length > 0) {
    message += 'Actions executed:\n'
    actionsExecuted.forEach(action => {
      message += `- ${action.message}\n`
    })
  }

  if (parsed.constraints.length > 0) {
    message += `\nConstraints noted: ${parsed.constraints.join(', ')}\n`
  }

  if (parsed.natural_language_instruction) {
    message += `\nInstruction: ${parsed.natural_language_instruction}\n`
  }

  message += '\nI\'ll stay silent unless severity increases.'

  return {
    parsed,
    actions_executed: actionsExecuted,
    message
  }
}

/**
 * Check if incident should trigger alert
 * 
 * This is the entry point for monitoring systems
 */
export async function shouldTriggerAlert(): Promise<{
  should_alert: boolean
  reason?: string
  snapshot?: Awaited<ReturnType<typeof getIncidentSnapshot>>
}> {
  try {
    const snapshot = await getIncidentSnapshot()

    // Only alert for SEV-1 and SEV-2 in prod/staging
    if (snapshot.env === 'local') {
      return { should_alert: false, reason: 'Local environment - no alerts' }
    }

    if (snapshot.severity_guess === 'SEV-3') {
      return { should_alert: false, reason: 'SEV-3 - no alert needed' }
    }

    // Check if kill switch already active (might be false alarm)
    if (snapshot.system_state.kill_switch_active && snapshot.severity_guess === 'SEV-2') {
      return { should_alert: false, reason: 'Kill switch already active, monitoring' }
    }

    return {
      should_alert: true,
      reason: `${snapshot.severity_guess} incident in ${snapshot.env}`,
      snapshot
    }
  } catch (error) {
    return {
      should_alert: false,
      reason: `Error checking incident: ${error instanceof Error ? error.message : 'Unknown'}`
    }
  }
}

/**
 * Handle no-reply default actions
 * 
 * Called periodically to check for incidents without replies
 * and execute default actions
 */
export async function handleNoReplyDefaults(
  ownerPhone: string,
  noReplyWindowMinutes: number = 15
): Promise<{
  checked: number
  executed: number
  errors: string[]
}> {
  const errors: string[] = []

  try {
    const unreplied = await getUnrepliedIncidents(noReplyWindowMinutes)

    let executed = 0

    for (const incident of unreplied) {
      try {
        // Execute default action (first recommendation, usually "A")
        const defaultAction = incident.assessment.recommended_actions[0]
        if (!defaultAction) {
          continue
        }

        // Map to action ID (simplified - same as reply processing)
        const actionMap: Record<string, string> = {
          'A': 'capture_snapshot',
          'B': 'capture_snapshot',
          'C': 'disable_scheduling',
          'D': 'capture_snapshot'
        }

        const actionId = actionMap[defaultAction.id]
        if (actionId) {
          const result = await executeAction(actionId, incident.snapshot.env)
          
          if (result.success) {
            executed++

            // Send follow-up SMS (direct Twilio call)
            const followUpMessage = `📋 Jarvis: No reply received. Executed default action:\n\n${defaultAction.label}\n\n${result.message}\n\nIncident: ${incident.incident_id}`

            if (
              process.env.TWILIO_ACCOUNT_SID &&
              process.env.TWILIO_AUTH_TOKEN &&
              process.env.TWILIO_FROM
            ) {
              await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
                {
                  method: 'POST',
                  headers: {
                    Authorization:
                      'Basic ' +
                      Buffer.from(
                        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
                      ).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                  },
                  body: new URLSearchParams({
                    From: process.env.TWILIO_FROM,
                    To: ownerPhone,
                    Body: followUpMessage
                  })
                }
              )
            } else if (process.env.NODE_ENV === 'development') {
              console.log('📱 [Jarvis Mock SMS - No Reply]:', followUpMessage)
            }
          } else {
            errors.push(`Failed to execute default action for ${incident.incident_id}: ${result.message}`)
          }
        }
      } catch (error) {
        errors.push(`Error processing incident ${incident.incident_id}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }

    return {
      checked: unreplied.length,
      executed,
      errors
    }
  } catch (error) {
    errors.push(`Error checking unreplied incidents: ${error instanceof Error ? error.message : 'Unknown'}`)
    return {
      checked: 0,
      executed: 0,
      errors
    }
  }
}


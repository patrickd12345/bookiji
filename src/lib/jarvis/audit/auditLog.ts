/**
 * Jarvis Audit Logging
 * 
 * Logs all actions, refusals, and outcomes for later querying.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import { logger, errorToContext } from '@/lib/logger'
import type { ActionResult, Environment, ParsedIntent, IncidentSnapshot, JarvisAssessment } from '../types'

export interface AuditLogEntry {
  timestamp: string
  sender_phone: string
  parsed_intent: ParsedIntent
  action_id?: string
  action_result?: ActionResult
  environment: Environment
  context?: string
  refusal_reason?: string
}

/**
 * Log action execution or refusal
 */
export async function logJarvisAction(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = getServerSupabase()

    // Store in jarvis_incidents table (reuse existing table)
    // We'll add a new incident_id for each command execution
    const incidentId = `command_${Date.now()}`

    // Create minimal snapshot for command execution
    const commandSnapshot: IncidentSnapshot = {
      env: entry.environment,
      timestamp: entry.timestamp,
      severity_guess: 'SEV-3',
      confidence: 0.5,
      signals: {
        error_rate_spike: false,
        invariant_violations: [],
        stripe_webhook_backlog: false,
        booking_failures: false,
        deploy_recent: false
      },
      system_state: {
        scheduling_enabled: true,
        kill_switch_active: false,
        degraded_mode: false
      },
      blast_radius: [],
      safe_components: [],
      unsafe_components: [],
      auto_actions_taken: []
    }

    // Create minimal assessment for command execution
    const commandAssessment: JarvisAssessment = {
      assessment: `SMS command: ${entry.action_id || 'refused'}`,
      severity: 'SEV-3',
      recommended_actions: [],
      what_happens_if_no_reply: '',
      confidence: 0.5
    }

    await supabase.from('jarvis_incidents').insert({
      incident_id: incidentId,
      incident_hash: `command_${entry.action_id || 'refused'}_${Date.now()}`,
      env: entry.environment,
      severity: 'SEV-3', // Commands are informational
      snapshot: commandSnapshot,
      assessment: commandAssessment,
      sent_at: entry.timestamp,
      replied: true, // Commands are always "replied" (they are the reply)
      replied_at: entry.timestamp
    })

    // Also log to console for immediate visibility
    logger.info('[Jarvis Audit]', {
      timestamp: entry.timestamp,
      sender: entry.sender_phone,
      action: entry.action_id || 'refused',
      success: entry.action_result?.success || false,
      reason: entry.refusal_reason || entry.action_result?.message
    })
  } catch (error) {
    // Audit logging failure should not break execution
    logger.error('[Jarvis] Audit logging failed', errorToContext(error))
  }
}


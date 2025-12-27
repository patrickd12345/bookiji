/**
 * Escalation-Aware Orchestrator
 * 
 * Handles escalation logic for existing incidents.
 * Called by cron to check if escalation is needed.
 */

import { getUnacknowledgedIncidents } from './state'
import { decideNextAction } from './decideNextAction'
import { notifyWithEscalation } from './notifyWithEscalation'
import { getServerSupabase } from '@/lib/supabaseServer'
import type { IncidentSnapshot, JarvisAssessment } from '../types'

/**
 * Check and escalate unacknowledged incidents
 */
export async function checkAndEscalate(
  ownerPhone: string
): Promise<{
  checked: number
  escalated: number
  suppressed: number
  errors: string[]
}> {
  const errors: string[] = []
  let escalated = 0
  let suppressed = 0

  try {
    const unacknowledged = await getUnacknowledgedIncidents()

    for (const incident of unacknowledged) {
      try {
        // Get full incident data
        const supabase = getServerSupabase()
        const { data: fullIncident, error } = await supabase
          .from('jarvis_incidents')
          .select('*')
          .eq('incident_id', incident.incident_id)
          .single()

        if (error || !fullIncident) {
          continue
        }

        const snapshot = fullIncident.snapshot as unknown as IncidentSnapshot
        const assessment = fullIncident.assessment as unknown as JarvisAssessment

        // Get escalation context
        const context = {
          severity: incident.severity as 'SEV-1' | 'SEV-2' | 'SEV-3',
          firstNotifiedAt: incident.first_notified_at,
          lastNotifiedAt: incident.last_notified_at,
          escalationLevel: incident.escalation_level,
          acknowledgedAt: null,
          notificationCount: incident.notification_count
        }

        // Decide next action
        const decision = await decideNextAction(context)

        if (decision.type === 'DO_NOT_NOTIFY' || decision.type === 'WAIT') {
          suppressed++
          continue
        }

        // Send escalation notification
        const result = await notifyWithEscalation(
          incident.incident_id,
          assessment,
          snapshot,
          ownerPhone
        )

        if (result.sent) {
          escalated++
        } else if (result.suppressed) {
          suppressed++
        }
      } catch (error) {
        errors.push(`Error processing incident ${incident.incident_id}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }

    return {
      checked: unacknowledged.length,
      escalated,
      suppressed,
      errors
    }
  } catch (error) {
    errors.push(`Error checking escalation: ${error instanceof Error ? error.message : 'Unknown'}`)
    return {
      checked: 0,
      escalated: 0,
      suppressed: 0,
      errors
    }
  }
}


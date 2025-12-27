/**
 * Jarvis Phase 5 - Suggestion Engine
 * 
 * Generates deterministic, rule-based suggestions for policy improvements.
 * NO LLM - all suggestions are computed from historical data and rules.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import type { PolicyConfig } from '../policy/types'

/**
 * Suggestion types
 */
export type SuggestionType =
  | 'REDUCE_QUIET_HOURS_NOTIFICATIONS'
  | 'LOWER_NOTIFICATION_CAP'
  | 'ADD_BATCHING_WINDOW'
  | 'INCREASE_SEVERITY_MAPPING'
  | 'CHANGE_CHANNEL_ORDERING'

/**
 * Policy patch (JSON Patch format)
 */
export interface PolicyPatch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test'
  path: string
  value?: unknown
}

/**
 * Suggestion record
 */
export interface PolicySuggestion {
  suggestion_id: string
  title: string
  description: string
  suggestion_type: SuggestionType
  rationale_metrics: {
    counts: Record<string, number>
    rates: Record<string, number>
    distributions: Record<string, unknown>
  }
  proposed_policy_patch: PolicyPatch[]
  risk_flags: string[]
  required_approvals: string[] // ['admin']
}

/**
 * Suggestion set
 */
export interface SuggestionSet {
  time_range: {
    start: string
    end: string
  }
  suggestions: PolicySuggestion[]
  generated_at: string
}

/**
 * Generate policy suggestions based on historical incidents
 */
export async function generatePolicySuggestions(
  timeRange: { start: string; end: string }
): Promise<SuggestionSet> {
  const supabase = getServerSupabase()

  // Get incidents in time range
  const { data: incidents } = await supabase
    .from('jarvis_incidents')
    .select('*')
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end)

  if (!incidents || incidents.length === 0) {
    return {
      time_range: timeRange,
      suggestions: [],
      generated_at: new Date().toISOString()
    }
  }

  // Get events for these incidents
  const incidentIds = incidents.map(i => i.incident_id)
  const { data: events } = await supabase
    .from('jarvis_incident_events')
    .select('*')
    .in('incident_id', incidentIds)
    .order('occurred_at', { ascending: true })

  const suggestions: PolicySuggestion[] = []

  // Suggestion 1: Reduce quiet hours notifications for SEV-2 if high ACK rates
  const quietHoursSuggestion = generateQuietHoursSuggestion(incidents, events || [])
  if (quietHoursSuggestion) {
    suggestions.push(quietHoursSuggestion)
  }

  // Suggestion 2: Lower notification cap if cap rarely reached and no missed ACKs
  const capSuggestion = generateCapSuggestion(incidents, events || [])
  if (capSuggestion) {
    suggestions.push(capSuggestion)
  }

  // Suggestion 3: Add batching window if multiple notifications within N minutes
  const batchingSuggestion = generateBatchingSuggestion(incidents, events || [])
  if (batchingSuggestion) {
    suggestions.push(batchingSuggestion)
  }

  // Suggestion 4: Increase severity mapping if repeated manual escalations
  const severitySuggestion = generateSeveritySuggestion(incidents, events || [])
  if (severitySuggestion) {
    suggestions.push(severitySuggestion)
  }

  // Suggestion 5: Change channel ordering (if multiple channels exist)
  const channelSuggestion = generateChannelSuggestion(incidents, events || [])
  if (channelSuggestion) {
    suggestions.push(channelSuggestion)
  }

  return {
    time_range: timeRange,
    suggestions,
    generated_at: new Date().toISOString()
  }
}

/**
 * Suggestion 1: Reduce quiet hours notifications for SEV-2
 */
function generateQuietHoursSuggestion(
  incidents: Array<Record<string, unknown>>,
  events: Array<Record<string, unknown>>
): PolicySuggestion | null {
  // Count SEV-2 incidents during quiet hours
  const sev2Incidents = incidents.filter(i => i.severity === 'SEV-2')
  if (sev2Incidents.length < 5) {
    return null // Need minimum data
  }

  // Count notifications sent during quiet hours for SEV-2
  let quietHoursNotifications = 0
  let totalQuietHoursDecisions = 0
  let ackedDuringQuietHours = 0

  for (const incident of sev2Incidents) {
    const incidentEvents = events.filter(e => e.incident_id === incident.incident_id)
    const decisionEvents = incidentEvents.filter(
      e => e.event_type === 'escalation_decision_made'
    )

    for (const decision of decisionEvents) {
      const trace = decision.trace as Record<string, unknown>
      if (trace.quiet_hours === true) {
        totalQuietHoursDecisions++
        if (decision.decision === 'SEND_SILENT_SMS' || decision.decision === 'SEND_LOUD_SMS') {
          quietHoursNotifications++
        }
      }
    }

    // Check if incident was ACKed during quiet hours
    const ackEvent = incidentEvents.find(e => e.event_type === 'acknowledged')
    if (ackEvent) {
      const decisionBeforeAck = decisionEvents.find(
        d => new Date(d.occurred_at as string) < new Date(ackEvent.occurred_at as string)
      )
      if (decisionBeforeAck) {
        const trace = decisionBeforeAck.trace as Record<string, unknown>
        if (trace.quiet_hours === true) {
          ackedDuringQuietHours++
        }
      }
    }
  }

  // If high ACK rate during quiet hours, suggest reducing notifications
  const ackRate = totalQuietHoursDecisions > 0 ? ackedDuringQuietHours / totalQuietHoursDecisions : 0

  if (ackRate > 0.7 && quietHoursNotifications > 3) {
    return {
      suggestion_id: `quiet_hours_${Date.now()}`,
      title: 'Reduce SEV-2 notifications during quiet hours',
      description: `High ACK rate (${(ackRate * 100).toFixed(0)}%) during quiet hours suggests SEV-2 notifications may be unnecessary. Consider suppressing SEV-2 notifications during quiet hours unless max_silent_minutes exceeded.`,
      suggestion_type: 'REDUCE_QUIET_HOURS_NOTIFICATIONS',
      rationale_metrics: {
        counts: {
          sev2_incidents: sev2Incidents.length,
          quiet_hours_notifications: quietHoursNotifications,
          acked_during_quiet_hours: ackedDuringQuietHours
        },
        rates: {
          ack_rate_during_quiet_hours: ackRate
        },
        distributions: {}
      },
      proposed_policy_patch: [
        {
          op: 'replace',
          path: '/severity_rules/SEV-2/wake_during_quiet_hours',
          value: false
        }
      ],
      risk_flags: ['May delay response for SEV-2 incidents during quiet hours'],
      required_approvals: ['admin']
    }
  }

  return null
}

/**
 * Suggestion 2: Lower notification cap
 */
function generateCapSuggestion(
  incidents: Array<Record<string, unknown>>,
  events: Array<Record<string, unknown>>
): PolicySuggestion | null {
  // Count incidents that hit the cap
  let incidentsAtCap = 0
  let incidentsBelowCap = 0
  let missedAcks = 0

  for (const incident of incidents) {
    const incidentEvents = events.filter(e => e.incident_id === incident.incident_id)
    const notificationEvents = incidentEvents.filter(
      e => e.event_type === 'notification_sent'
    )

    const notificationCount = notificationEvents.length
    if (notificationCount >= 5) {
      incidentsAtCap++
    } else {
      incidentsBelowCap++
    }

    // Check if incident was never ACKed
    const ackEvent = incidentEvents.find(e => e.event_type === 'acknowledged')
    if (!ackEvent && incident.resolved === true) {
      missedAcks++
    }
  }

  // If cap rarely reached and no missed ACKs, suggest lowering cap
  const capHitRate = incidents.length > 0 ? incidentsAtCap / incidents.length : 0
  const missedAckRate = incidents.length > 0 ? missedAcks / incidents.length : 0

  if (capHitRate < 0.1 && missedAckRate < 0.05 && incidents.length >= 10) {
    return {
      suggestion_id: `cap_${Date.now()}`,
      title: 'Consider lowering notification cap',
      description: `Cap rarely reached (${(capHitRate * 100).toFixed(0)}% of incidents) with low missed ACK rate (${(missedAckRate * 100).toFixed(0)}%). Consider reducing cap from 5 to 4.`,
      suggestion_type: 'LOWER_NOTIFICATION_CAP',
      rationale_metrics: {
        counts: {
          incidents_at_cap: incidentsAtCap,
          incidents_below_cap: incidentsBelowCap,
          missed_acks: missedAcks
        },
        rates: {
          cap_hit_rate: capHitRate,
          missed_ack_rate: missedAckRate
        },
        distributions: {}
      },
      proposed_policy_patch: [
        {
          op: 'replace',
          path: '/notification_cap',
          value: 4
        }
      ],
      risk_flags: ['May reduce notification redundancy but could miss edge cases'],
      required_approvals: ['admin']
    }
  }

  return null
}

/**
 * Suggestion 3: Add batching window
 */
function generateBatchingSuggestion(
  incidents: Array<Record<string, unknown>>,
  events: Array<Record<string, unknown>>
): PolicySuggestion | null {
  // Count incidents with multiple notifications within 5 minutes
  let incidentsWithRapidNotifications = 0

  for (const incident of incidents) {
    const incidentEvents = events.filter(e => e.incident_id === incident.incident_id)
    const notificationEvents = incidentEvents
      .filter(e => e.event_type === 'notification_sent')
      .sort((a, b) => new Date(a.occurred_at as string).getTime() - new Date(b.occurred_at as string).getTime())

    // Check for rapid notifications (within 5 minutes)
    for (let i = 0; i < notificationEvents.length - 1; i++) {
      const timeDiff = new Date(notificationEvents[i + 1].occurred_at as string).getTime() -
        new Date(notificationEvents[i].occurred_at as string).getTime()
      if (timeDiff < 5 * 60 * 1000) {
        incidentsWithRapidNotifications++
        break
      }
    }
  }

  const rapidNotificationRate = incidents.length > 0
    ? incidentsWithRapidNotifications / incidents.length
    : 0

  if (rapidNotificationRate > 0.2 && incidents.length >= 10) {
    return {
      suggestion_id: `batching_${Date.now()}`,
      title: 'Add batching window for rapid notifications',
      description: `${(rapidNotificationRate * 100).toFixed(0)}% of incidents have multiple notifications within 5 minutes. Consider adding a batching window to group notifications.`,
      suggestion_type: 'ADD_BATCHING_WINDOW',
      rationale_metrics: {
        counts: {
          incidents_with_rapid_notifications: incidentsWithRapidNotifications,
          total_incidents: incidents.length
        },
        rates: {
          rapid_notification_rate: rapidNotificationRate
        },
        distributions: {}
      },
      proposed_policy_patch: [
        {
          op: 'add',
          path: '/batching_window_minutes',
          value: 5
        }
      ],
      risk_flags: ['May delay initial notification delivery'],
      required_approvals: ['admin']
    }
  }

  return null
}

/**
 * Suggestion 4: Increase severity mapping
 */
function generateSeveritySuggestion(
  incidents: Array<Record<string, unknown>>,
  events: Array<Record<string, unknown>>
): PolicySuggestion | null {
  // This is a placeholder - would need more data about manual escalations
  // For now, return null
  return null
}

/**
 * Suggestion 5: Change channel ordering
 */
function generateChannelSuggestion(
  incidents: Array<Record<string, unknown>>,
  events: Array<Record<string, unknown>>
): PolicySuggestion | null {
  // This is a placeholder - would need multiple channels configured
  // For now, return null
  return null
}

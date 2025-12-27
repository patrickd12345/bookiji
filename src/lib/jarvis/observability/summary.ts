/**
 * Jarvis Observability - Post-Incident Summary Generation
 * 
 * Generates and persists summaries when incidents reach terminal state.
 */

import { getServerSupabase } from '@/lib/supabaseServer'

export interface IncidentSummary {
  incident_id: string
  severity: 'SEV-1' | 'SEV-2' | 'SEV-3'
  started_at: string
  ended_at: string
  duration_ms: number
  notifications_sent: number
  notifications_suppressed: number
  acknowledged_at: string | null
  time_to_ack_ms: number | null
  terminal_state: string
  top_decision_rules: string[]
}

/**
 * Generate and persist incident summary
 */
export async function generateAndStoreSummary(incidentId: string): Promise<void> {
  try {
    const supabase = getServerSupabase()

    // Get incident data
    const { data: incident, error: incidentError } = await supabase
      .from('jarvis_incidents')
      .select('*')
      .eq('incident_id', incidentId)
      .single()

    if (incidentError || !incident) {
      console.error('[Jarvis] Error fetching incident for summary:', incidentError)
      return
    }

    // Get all events for this incident
    const { data: events, error: eventsError } = await supabase
      .from('jarvis_incident_events')
      .select('*')
      .eq('incident_id', incidentId)
      .order('occurred_at', { ascending: true })

    if (eventsError) {
      console.error('[Jarvis] Error fetching events for summary:', eventsError)
      return
    }

    if (!events || events.length === 0) {
      console.warn('[Jarvis] No events found for incident:', incidentId)
      return
    }

    // Calculate summary fields
    const startedAt = incident.created_at || incident.sent_at
    const endedAt = incident.resolved_at || new Date().toISOString()
    const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime()

    // Count notifications
    const notificationsSent = events.filter(e => e.event_type === 'notification_sent').length
    const notificationsSuppressed = events.filter(e => e.event_type === 'notification_suppressed').length

    // Get acknowledged time
    const acknowledgedEvent = events.find(e => e.event_type === 'acknowledged')
    const acknowledgedAt = acknowledgedEvent?.occurred_at || incident.acknowledged_at || null
    const timeToAckMs = acknowledgedAt
      ? new Date(acknowledgedAt).getTime() - new Date(startedAt).getTime()
      : null

    // Extract top decision rules (from escalation_decision_made events)
    const decisionEvents = events.filter(e => e.event_type === 'escalation_decision_made' && e.trace)
    const ruleCounts: Record<string, number> = {}
    
    decisionEvents.forEach(event => {
      const ruleFired = (event.trace as { rule_fired?: string })?.rule_fired
      if (ruleFired) {
        ruleCounts[ruleFired] = (ruleCounts[ruleFired] || 0) + 1
      }
    })

    // Get top 3 rules by frequency, or last 3 decisions if fewer than 3 unique rules
    const topRules = Object.entries(ruleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([rule]) => rule)

    // If we have fewer than 3 rules but more decisions, take last 3 unique rules
    if (topRules.length < 3 && decisionEvents.length > topRules.length) {
      const lastRules: string[] = []
      for (let i = decisionEvents.length - 1; i >= 0 && lastRules.length < 3; i--) {
        const ruleFired = (decisionEvents[i].trace as { rule_fired?: string })?.rule_fired
        if (ruleFired && !lastRules.includes(ruleFired)) {
          lastRules.unshift(ruleFired)
        }
      }
      if (lastRules.length > topRules.length) {
        topRules.push(...lastRules.slice(topRules.length))
      }
    }

    // Determine terminal state
    const terminalState = incident.resolved ? 'resolved' : 'unknown'

    const summary: IncidentSummary = {
      incident_id: incidentId,
      severity: incident.severity as 'SEV-1' | 'SEV-2' | 'SEV-3',
      started_at: startedAt,
      ended_at: endedAt,
      duration_ms: durationMs,
      notifications_sent: notificationsSent,
      notifications_suppressed: notificationsSuppressed,
      acknowledged_at: acknowledgedAt,
      time_to_ack_ms: timeToAckMs,
      terminal_state: terminalState,
      top_decision_rules: topRules
    }

    // Upsert summary
    await supabase
      .from('jarvis_incident_summary')
      .upsert(summary, {
        onConflict: 'incident_id'
      })
  } catch (error) {
    console.error('[Jarvis] Error generating summary:', error)
  }
}

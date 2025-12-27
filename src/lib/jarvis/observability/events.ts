/**
 * Jarvis Observability - Event Storage
 * 
 * Stores all incident-related events for timeline reconstruction.
 * 
 * Event naming consistency: All event_type strings must exactly match
 * the CHECK constraint in supabase/migrations/20251228000000_jarvis_phase4_observability.sql
 * 
 * Linkage pattern: Notification events (notification_sent, notification_suppressed)
 * are linked to escalation_decision_made events via temporal ordering:
 * - Same incident_id
 * - Decision occurred_at <= notification occurred_at
 * - Nearest prior decision is the parent
 * 
 * This is acceptable for event sourcing but requires careful ordering guarantees.
 * Future enhancement: Consider explicit decision_event_id FK for stronger guarantees.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import type { DecisionTrace } from '../escalation/decideNextAction'

/**
 * Event types - MUST match database CHECK constraint exactly
 * See: supabase/migrations/20251228000000_jarvis_phase4_observability.sql
 */
export type IncidentEventType =
  | 'incident_created'
  | 'escalation_decision_made'
  | 'notification_sent'
  | 'notification_suppressed'
  | 'acknowledged'
  | 'incident_resolved'

export type EscalationDecisionType = 'DO_NOT_NOTIFY' | 'SEND_SILENT_SMS' | 'SEND_LOUD_SMS' | 'WAIT'

/**
 * Store an incident event
 */
export async function storeIncidentEvent(params: {
  incidentId: string
  eventType: IncidentEventType
  occurredAt?: string
  decision?: EscalationDecisionType
  trace?: DecisionTrace
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = getServerSupabase()
    
    await supabase.from('jarvis_incident_events').insert({
      incident_id: params.incidentId,
      event_type: params.eventType,
      occurred_at: params.occurredAt || new Date().toISOString(),
      decision: params.decision || null,
      trace: params.trace ? (params.trace as unknown as Record<string, unknown>) : null,
      metadata: params.metadata ? (params.metadata as unknown as Record<string, unknown>) : null
    })
  } catch (error) {
    // Event storage failure should not break execution, but log it
    console.error('[Jarvis] Error storing incident event:', error)
  }
}

/**
 * Store escalation decision event
 */
export async function storeEscalationDecision(
  incidentId: string,
  decision: EscalationDecisionType,
  trace: DecisionTrace,
  occurredAt?: string
): Promise<void> {
  await storeIncidentEvent({
    incidentId,
    eventType: 'escalation_decision_made',
    occurredAt,
    decision,
    trace
  })
}

/**
 * Store notification sent event
 */
export async function storeNotificationSent(
  incidentId: string,
  channel: string,
  decisionTrace?: DecisionTrace,
  occurredAt?: string
): Promise<void> {
  await storeIncidentEvent({
    incidentId,
    eventType: 'notification_sent',
    occurredAt,
    decision: decisionTrace ? 'SEND_SILENT_SMS' : undefined, // Infer from trace if available
    trace: decisionTrace,
    metadata: { channel }
  })
}

/**
 * Store notification suppressed event
 */
export async function storeNotificationSuppressed(
  incidentId: string,
  reason: string,
  decisionTrace?: DecisionTrace,
  occurredAt?: string
): Promise<void> {
  await storeIncidentEvent({
    incidentId,
    eventType: 'notification_suppressed',
    occurredAt,
    decision: decisionTrace ? 'DO_NOT_NOTIFY' : undefined,
    trace: decisionTrace,
    metadata: { reason }
  })
}

/**
 * Store incident created event
 */
export async function storeIncidentCreated(
  incidentId: string,
  severity: string,
  occurredAt?: string
): Promise<void> {
  await storeIncidentEvent({
    incidentId,
    eventType: 'incident_created',
    occurredAt,
    metadata: { severity }
  })
}

/**
 * Store acknowledged event
 */
export async function storeAcknowledged(
  incidentId: string,
  occurredAt?: string
): Promise<void> {
  await storeIncidentEvent({
    incidentId,
    eventType: 'acknowledged',
    occurredAt
  })
}

/**
 * Store incident resolved event
 */
export async function storeIncidentResolved(
  incidentId: string,
  terminalState: string,
  occurredAt?: string
): Promise<void> {
  await storeIncidentEvent({
    incidentId,
    eventType: 'incident_resolved',
    occurredAt,
    metadata: { terminal_state: terminalState }
  })
}

/**
 * Jarvis Observability - Deterministic Incident Badges
 * 
 * Layer 1: Classification hints for humans.
 * 
 * PHILOSOPHY:
 * - Badges provide *knowledge*, not *authority*
 * - Badges must NEVER:
 *   - assign severity
 *   - assign Incident Commander
 *   - recommend rollback
 *   - claim customer impact
 * - Humans remain the decision-makers
 * 
 * This is a pure, deterministic resolver with no side effects.
 */

import type { DecisionTrace } from '../escalation/decideNextAction'
import type { IncidentSnapshot } from '../types'

/**
 * Incident classification badges
 * 
 * Small, closed taxonomy of foreseeable incident patterns.
 */
export type IncidentClass =
  | 'PAYMENT_INTEGRITY'
  | 'BOOKING_INVARIANT'
  | 'ESCALATION_STORM'
  | 'AUTH_ROLE_DRIFT'
  | 'EXTERNAL_DEPENDENCY'
  | 'DESTRUCTIVE_OP_ATTEMPT'
  | 'UI_FLOW_REGRESSION'
  | 'DATA_INTEGRITY'
  | 'UNKNOWN'

/**
 * Badge confidence level
 */
export type BadgeConfidence = 'high' | 'medium' | 'low'

/**
 * Severity range hint (informational only)
 */
export type SeverityRange = 'SEV-1–SEV-2' | 'SEV-2–SEV-3' | 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-0'

/**
 * Active guardrails (informational only)
 */
export type Guardrail = 'quiet_hours' | 'notification_cap' | 'ack_gating' | 'kill_switch'

/**
 * Incident Badge
 * 
 * Provides classification hints to humans.
 * Does not make decisions.
 */
export interface IncidentBadge {
  incident_class: IncidentClass
  confidence: BadgeConfidence
  typical_severity_range: SeverityRange
  guardrails_active: Guardrail[]
}

/**
 * Context for badge resolution
 */
export interface BadgeContext {
  snapshot?: IncidentSnapshot
  trace?: DecisionTrace
  event_type: 'incident_created' | 'escalation_decision_made'
}

/**
 * Resolve incident badges deterministically
 * 
 * Pure function: no side effects, no async, no randomness.
 * 
 * @param context - Incident context (snapshot, trace, event type)
 * @returns Array of badges (may be empty if signals are insufficient)
 */
export function resolveIncidentBadges(context: BadgeContext): IncidentBadge[] {
  const badges: IncidentBadge[] = []
  const { snapshot, trace, event_type } = context

  // Only process incident_created and escalation_decision_made events
  if (event_type !== 'incident_created' && event_type !== 'escalation_decision_made') {
    return []
  }

  // Need at least snapshot or trace to classify
  if (!snapshot && !trace) {
    return []
  }

  // Extract signals from snapshot
  const signals = snapshot?.signals
  const systemState = snapshot?.system_state
  const blastRadius = snapshot?.blast_radius || []
  const unsafeComponents = snapshot?.unsafe_components || []
  const autoActions = snapshot?.auto_actions_taken || []

  // Extract decision context from trace
  const ruleFired = trace?.rule_fired
  const notificationsSent = trace?.notifications_sent || 0
  const cap = trace?.cap || 0
  const quietHours = trace?.quiet_hours || false
  const severity = trace?.severity || snapshot?.severity_guess

  // Determine active guardrails
  const guardrails: Guardrail[] = []
  if (quietHours) guardrails.push('quiet_hours')
  // Notification cap is active when at or near cap (>= 80% of cap)
  if (notificationsSent > 0 && cap > 0 && notificationsSent >= cap * 0.8) guardrails.push('notification_cap')
  if (ruleFired === 'acknowledged_no_notify') guardrails.push('ack_gating')
  if (systemState?.kill_switch_active) guardrails.push('kill_switch')

  // Classification rules (deterministic switch/case)

  // PAYMENT_INTEGRITY: Stripe webhook backlog or payment-related issues
  if (signals?.stripe_webhook_backlog) {
    badges.push({
      incident_class: 'PAYMENT_INTEGRITY',
      confidence: 'high',
      typical_severity_range: 'SEV-1–SEV-2',
      guardrails_active: guardrails
    })
  }

  // BOOKING_INVARIANT: Booking failures or invariant violations related to bookings
  if (signals?.booking_failures || (signals?.invariant_violations && signals.invariant_violations.length > 0 && blastRadius.includes('bookings'))) {
    badges.push({
      incident_class: 'BOOKING_INVARIANT',
      confidence: signals?.booking_failures ? 'high' : 'medium',
      typical_severity_range: 'SEV-1–SEV-2',
      guardrails_active: guardrails
    })
  }

  // DATA_INTEGRITY: Invariant violations detected
  if (signals?.invariant_violations && signals.invariant_violations.length > 0) {
    badges.push({
      incident_class: 'DATA_INTEGRITY',
      confidence: 'high',
      typical_severity_range: 'SEV-1–SEV-2',
      guardrails_active: guardrails
    })
  }

  // ESCALATION_STORM: High notification count approaching cap
  // Can be determined from trace alone (no snapshot required)
  if (notificationsSent > 0 && cap > 0 && notificationsSent >= cap * 0.8) {
    badges.push({
      incident_class: 'ESCALATION_STORM',
      confidence: notificationsSent >= cap ? 'high' : 'medium',
      typical_severity_range: 'SEV-2–SEV-3',
      guardrails_active: guardrails
    })
  }

  // DESTRUCTIVE_OP_ATTEMPT: Kill switch active or destructive auto-actions
  if (systemState?.kill_switch_active || autoActions.some(action => action.includes('kill_switch') || action.includes('disable'))) {
    badges.push({
      incident_class: 'DESTRUCTIVE_OP_ATTEMPT',
      confidence: systemState?.kill_switch_active ? 'high' : 'medium',
      typical_severity_range: 'SEV-1–SEV-2',
      guardrails_active: guardrails
    })
  }

  // EXTERNAL_DEPENDENCY: Error rate spike without clear internal cause
  if (signals?.error_rate_spike && !signals.booking_failures && !signals.stripe_webhook_backlog && (signals.invariant_violations?.length || 0) === 0) {
    badges.push({
      incident_class: 'EXTERNAL_DEPENDENCY',
      confidence: 'medium',
      typical_severity_range: 'SEV-2–SEV-3',
      guardrails_active: guardrails
    })
  }

  // UI_FLOW_REGRESSION: Recent deploy with error rate spike
  if (signals?.deploy_recent && signals?.error_rate_spike) {
    badges.push({
      incident_class: 'UI_FLOW_REGRESSION',
      confidence: 'medium',
      typical_severity_range: 'SEV-2–SEV-3',
      guardrails_active: guardrails
    })
  }

  // AUTH_ROLE_DRIFT: Invariant violations in auth/access control (heuristic)
  if (signals?.invariant_violations && signals.invariant_violations.some(v => 
    v.toLowerCase().includes('auth') || 
    v.toLowerCase().includes('role') || 
    v.toLowerCase().includes('permission') ||
    v.toLowerCase().includes('access')
  )) {
    badges.push({
      incident_class: 'AUTH_ROLE_DRIFT',
      confidence: 'medium',
      typical_severity_range: 'SEV-1–SEV-2',
      guardrails_active: guardrails
    })
  }

  // If no badges matched and we have sufficient signals, classify as UNKNOWN
  // Only if we have signals but none of the specific patterns matched
  if (badges.length === 0 && snapshot && (signals?.error_rate_spike || signals?.booking_failures || signals?.stripe_webhook_backlog || (signals?.invariant_violations?.length || 0) > 0)) {
    // Check if we matched any specific pattern - if not, classify as UNKNOWN
    const hasSpecificPattern = signals?.stripe_webhook_backlog || 
                               signals?.booking_failures || 
                               (signals?.invariant_violations && signals.invariant_violations.length > 0) ||
                               systemState?.kill_switch_active ||
                               (signals?.deploy_recent && signals?.error_rate_spike)
    
    if (!hasSpecificPattern || (signals?.error_rate_spike && !signals?.booking_failures && !signals?.stripe_webhook_backlog && (signals?.invariant_violations?.length || 0) === 0 && !signals?.deploy_recent)) {
      badges.push({
        incident_class: 'UNKNOWN',
        confidence: 'low',
        typical_severity_range: severity === 'SEV-1' ? 'SEV-1' : severity === 'SEV-2' ? 'SEV-2' : 'SEV-2–SEV-3',
        guardrails_active: guardrails
      })
    }
  }

  return badges
}


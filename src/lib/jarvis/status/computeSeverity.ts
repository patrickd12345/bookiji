/**
 * Compute Severity (Deterministic)
 * 
 * Rule-based severity computation. No LLM inference.
 * Must be explainable and auditable.
 */

import type { IncidentSnapshot, Severity } from '../types'

export interface SeverityExplanation {
  severity: Severity
  reason: string
  signals: {
    error_rate_spike: boolean
    booking_failures: boolean
    stripe_backlog: boolean
    invariant_violations: number
    kill_switch_active: boolean
  }
  downgrade_reasons?: string[] // Why severity might be lower than expected
}

/**
 * Compute severity deterministically from snapshot
 */
export function computeSeverity(snapshot: IncidentSnapshot): SeverityExplanation {
  const signals = snapshot.signals
  const systemState = snapshot.system_state
  const env = snapshot.env

  // Count active signals
  const activeSignals = [
    signals.error_rate_spike,
    signals.booking_failures,
    signals.stripe_webhook_backlog,
    signals.invariant_violations.length > 0
  ].filter(Boolean).length

  const downgradeReasons: string[] = []

  // SEV-1: Critical issues in prod
  if (env === 'prod') {
    // Invariant violations are always SEV-1 in prod
    if (signals.invariant_violations.length > 0) {
      return {
        severity: 'SEV-1',
        reason: 'Invariant violations detected in production',
        signals: {
          error_rate_spike: signals.error_rate_spike,
          booking_failures: signals.booking_failures,
          stripe_backlog: signals.stripe_webhook_backlog,
          invariant_violations: signals.invariant_violations.length,
          kill_switch_active: systemState.kill_switch_active
        }
      }
    }

    // Error spike + booking failures = SEV-1
    if (signals.error_rate_spike && signals.booking_failures) {
      return {
        severity: 'SEV-1',
        reason: 'Error rate spike combined with booking failures in production',
        signals: {
          error_rate_spike: signals.error_rate_spike,
          booking_failures: signals.booking_failures,
          stripe_backlog: signals.stripe_webhook_backlog,
          invariant_violations: signals.invariant_violations.length,
          kill_switch_active: systemState.kill_switch_active
        }
      }
    }

    // Stripe backlog + booking failures = SEV-1
    if (signals.stripe_webhook_backlog && signals.booking_failures) {
      return {
        severity: 'SEV-1',
        reason: 'Payment processing backlog combined with booking failures in production',
        signals: {
          error_rate_spike: signals.error_rate_spike,
          booking_failures: signals.booking_failures,
          stripe_backlog: signals.stripe_webhook_backlog,
          invariant_violations: signals.invariant_violations.length,
          kill_switch_active: systemState.kill_switch_active
        }
      }
    }
  }

  // Kill switch active + active signals = SEV-1 (something is very wrong)
  if (systemState.kill_switch_active && activeSignals > 0) {
    return {
      severity: 'SEV-1',
      reason: 'Kill switch active with ongoing issues',
      signals: {
        error_rate_spike: signals.error_rate_spike,
        booking_failures: signals.booking_failures,
        stripe_backlog: signals.stripe_webhook_backlog,
        invariant_violations: signals.invariant_violations.length,
        kill_switch_active: systemState.kill_switch_active
      }
    }
  }

  // SEV-2: Degraded but not critical
  if (activeSignals > 0) {
    // Check for downgrade reasons
    if (!signals.booking_failures) {
      downgradeReasons.push('No bookings impacted')
    }
    if (!signals.stripe_webhook_backlog) {
      downgradeReasons.push('Payments processing normally')
    }

    return {
      severity: 'SEV-2',
      reason: `Active signals detected: ${activeSignals} issue(s)`,
      signals: {
        error_rate_spike: signals.error_rate_spike,
        booking_failures: signals.booking_failures,
        stripe_backlog: signals.stripe_webhook_backlog,
        invariant_violations: signals.invariant_violations.length,
        kill_switch_active: systemState.kill_switch_active
      },
      downgrade_reasons: downgradeReasons.length > 0 ? downgradeReasons : undefined
    }
  }

  // SEV-3: Everything else
  return {
    severity: 'SEV-3',
    reason: 'No active signals detected',
    signals: {
      error_rate_spike: signals.error_rate_spike,
      booking_failures: signals.booking_failures,
      stripe_backlog: signals.stripe_webhook_backlog,
      invariant_violations: signals.invariant_violations.length,
      kill_switch_active: systemState.kill_switch_active
    }
  }
}


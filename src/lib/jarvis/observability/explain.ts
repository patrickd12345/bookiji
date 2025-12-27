/**
 * Jarvis Observability - Deterministic Explanation Formatter
 * 
 * Converts decision traces into human-readable explanations.
 * Deterministic switch/case mapping only - no LLM, no randomness.
 */

import type { DecisionTrace } from '../escalation/decideNextAction'

/**
 * Explain a decision trace deterministically
 */
export function explainDecision(trace: DecisionTrace | null | undefined): string {
  if (!trace) {
    return 'No decision trace available'
  }

  const ruleFired = trace.rule_fired
  const severity = trace.severity
  const quietHours = trace.quiet_hours
  const notificationsSent = trace.notifications_sent
  const cap = trace.cap

  // Deterministic switch/case mapping
  switch (ruleFired) {
    case 'acknowledged_no_notify':
      return 'Incident acknowledged by owner; no notification sent.'

    case 'cap_reached':
      return `Notification cap reached (${notificationsSent}/${cap}); escalation paused.`

    case 'sev1_first_notification':
      return `SEV-1 incident detected; immediate loud notification sent${quietHours ? ' (during quiet hours)' : ''}.`

    case 'sev2_first_notification':
      return `SEV-2 incident detected; informational notification sent${quietHours ? ' (during quiet hours)' : ''}.`

    case 'sev2_quiet_hours_silent_only':
      return 'Quiet hours active; SEV-2 incidents cannot send loud notifications. Waiting until quiet hours end.'

    case 'sev3_no_notification':
      return 'SEV-3 incidents do not trigger notifications.'

    case 'sev1_max_silent_exceeded':
      return 'SEV-1 incident exceeded maximum silent period; loud escalation notification sent.'

    case 'sev1_interval_escalation':
      return `SEV-1 escalation interval reached; loud escalation notification sent${quietHours ? ' (during quiet hours)' : ''}.`

    case 'sev2_quiet_hours_max_silent_exceeded':
      return 'SEV-2 incident exceeded maximum silent period during quiet hours; loud escalation notification sent.'

    case 'sev2_quiet_hours_wait':
      return 'Quiet hours active; SEV-2 escalation deferred until quiet hours end.'

    case 'sev2_interval_escalation':
      return `SEV-2 escalation interval reached; silent update notification sent${quietHours ? ' (during quiet hours)' : ''}.`

    case 'interval_wait':
      return `Next escalation scheduled; waiting for escalation interval.`

    case 'default_no_notify':
      return 'No escalation needed at this time.'

    default:
      // Fallback for unknown rules
      return `Decision: ${ruleFired} (severity: ${severity}, quiet hours: ${quietHours}, notifications: ${notificationsSent}/${cap})`
  }
}

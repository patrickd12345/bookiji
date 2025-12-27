/**
 * Escalation Decision Engine
 * 
 * Deterministic logic to decide when and how to notify.
 * No LLM. Pure function.
 */

import { getSleepPolicy, isInQuietHours, minutesUntilQuietHoursEnd } from './sleepPolicy'
import type { Severity } from '../types'

export type EscalationDecision =
  | { type: 'DO_NOT_NOTIFY'; reason: string; trace: DecisionTrace }
  | { type: 'SEND_SILENT_SMS'; messageType: 'informational' | 'update'; trace: DecisionTrace }
  | { type: 'SEND_LOUD_SMS'; messageType: 'wake' | 'escalation'; trace: DecisionTrace }
  | { type: 'WAIT'; until: string; reason: string; trace: DecisionTrace }

/**
 * Decision Trace - Machine-readable trace of decision logic
 * Required fields; no optional fields allowed
 * 
 * Phase 5: Extended with policy metadata for traceability
 */
export interface DecisionTrace {
  severity: Severity
  quiet_hours: boolean
  notifications_sent: number
  cap: number
  rule_fired: string
  // Phase 5: Policy metadata (optional for backward compatibility)
  policy_id?: string
  policy_version?: string
  policy_checksum?: string
}

export interface EscalationContext {
  severity: Severity
  firstNotifiedAt: string | null
  lastNotifiedAt: string | null
  escalationLevel: number // 0 = first notification, 1+ = escalations
  acknowledgedAt: string | null
  notificationCount: number // Total SMS sent for this incident
}

/**
 * Create base trace object
 */
function createTrace(
  context: EscalationContext,
  ruleFired: string,
  inQuietHours: boolean,
  policy: Awaited<ReturnType<typeof getSleepPolicy>>,
  policyMetadata?: { policy_id: string; version: string; checksum: string }
): DecisionTrace {
  const trace: DecisionTrace = {
    severity: context.severity,
    quiet_hours: inQuietHours,
    notifications_sent: context.notificationCount,
    cap: policy.maxNotificationsPerIncident,
    rule_fired: ruleFired
  }

  // Phase 5: Add policy metadata if available
  if (policyMetadata) {
    trace.policy_id = policyMetadata.policy_id
    trace.policy_version = policyMetadata.version
    trace.policy_checksum = policyMetadata.checksum
  }

  return trace
}

/**
 * Decide next escalation action (deterministic)
 * 
 * Phase 5: Accepts optional policy parameter for simulation.
 * If not provided, loads active policy from database.
 */
export async function decideNextAction(
  context: EscalationContext,
  policy?: Awaited<ReturnType<typeof getSleepPolicy>>,
  policyMetadata?: { policy_id: string; version: string; checksum: string }
): Promise<EscalationDecision> {
  const activePolicy = policy || await getSleepPolicy()
  const now = new Date()
  const inQuietHours = isInQuietHours(activePolicy)
  
  // Phase 5: Load policy metadata if not provided
  let metadata = policyMetadata
  if (!metadata && !policy) {
    try {
      const { getActivePolicy } = await import('../policy/registry')
      const policyRecord = await getActivePolicy()
      metadata = {
        policy_id: policyRecord.policy_id,
        version: policyRecord.version,
        checksum: policyRecord.checksum
      }
    } catch (error) {
      // Fallback: metadata will be undefined (backward compatible)
      console.warn('[Jarvis] Could not load policy metadata:', error)
    }
  }

  // Rule 1: If acknowledged, do not notify
  if (context.acknowledgedAt) {
      return {
        type: 'DO_NOT_NOTIFY',
        reason: 'Incident acknowledged by owner',
        trace: createTrace(context, 'acknowledged_no_notify', inQuietHours, activePolicy, metadata)
      }
  }

  // Rule 2: Hard cap on notifications
  if (context.notificationCount >= activePolicy.maxNotificationsPerIncident) {
    return {
      type: 'DO_NOT_NOTIFY',
      reason: `Maximum notifications (${activePolicy.maxNotificationsPerIncident}) reached`,
      trace: createTrace(context, 'cap_reached', inQuietHours, activePolicy, metadata)
    }
  }

  // Rule 3: First notification logic
  if (!context.firstNotifiedAt) {
    // SEV-1: Always notify immediately, even in quiet hours
    if (context.severity === 'SEV-1') {
      return {
        type: 'SEND_LOUD_SMS',
        messageType: 'wake',
        trace: createTrace(context, 'sev1_first_notification', inQuietHours, activePolicy, metadata)
      }
    }

    // SEV-2: Notify immediately if not in quiet hours
    if (context.severity === 'SEV-2') {
      if (!inQuietHours) {
        return {
          type: 'SEND_SILENT_SMS',
          messageType: 'informational',
          trace: createTrace(context, 'sev2_first_notification', inQuietHours, activePolicy, metadata)
        }
      } else {
        // Wait until quiet hours end
        const minutesUntilEnd = minutesUntilQuietHoursEnd(activePolicy)
        if (minutesUntilEnd !== null) {
          const waitUntil = new Date(now.getTime() + minutesUntilEnd * 60 * 1000)
          return {
            type: 'WAIT',
            until: waitUntil.toISOString(),
            reason: `Quiet hours active. Will notify at ${activePolicy.quietHours.end}`,
            trace: createTrace(context, 'sev2_quiet_hours_silent_only', inQuietHours, activePolicy, metadata)
          }
        }
      }
    }

    // SEV-3: Never notify (informational only)
    return {
      type: 'DO_NOT_NOTIFY',
      reason: 'SEV-3 incidents do not trigger notifications',
      trace: createTrace(context, 'sev3_no_notification', inQuietHours, activePolicy, metadata)
    }
  }

  // Rule 4: Escalation logic (after first notification)
  const firstNotified = new Date(context.firstNotifiedAt)
  const minutesSinceFirst = Math.floor((now.getTime() - firstNotified.getTime()) / (1000 * 60))

  // Check if we've exceeded max silent minutes (even in quiet hours for SEV-1)
  if (context.severity === 'SEV-1' && minutesSinceFirst >= activePolicy.maxSilentMinutes) {
    return {
      type: 'SEND_LOUD_SMS',
      messageType: 'escalation',
      trace: createTrace(context, 'sev1_max_silent_exceeded', inQuietHours, activePolicy, metadata)
    }
  }

  // Check escalation intervals
  const intervals = activePolicy.escalationIntervalsMinutes
  const currentLevel = context.escalationLevel
  const lastNotified = context.lastNotifiedAt ? new Date(context.lastNotifiedAt) : firstNotified
  const minutesSinceLast = Math.floor((now.getTime() - lastNotified.getTime()) / (1000 * 60))

  // Determine next escalation interval
  const nextInterval = intervals[currentLevel] || intervals[intervals.length - 1]

  if (minutesSinceLast >= nextInterval) {
    // Time for escalation
    if (context.severity === 'SEV-1') {
      // SEV-1: Always escalate loudly
      return {
        type: 'SEND_LOUD_SMS',
        messageType: 'escalation',
        trace: createTrace(context, 'sev1_interval_escalation', inQuietHours, activePolicy, metadata)
      }
    } else if (context.severity === 'SEV-2') {
      // SEV-2: Escalate silently if in quiet hours, otherwise normally
      if (inQuietHours) {
        // Check if we've waited long enough
        if (minutesSinceFirst >= activePolicy.maxSilentMinutes) {
          return {
            type: 'SEND_LOUD_SMS',
            messageType: 'escalation',
            trace: createTrace(context, 'sev2_quiet_hours_max_silent_exceeded', inQuietHours, activePolicy, metadata)
          }
        } else {
          // Still in quiet hours, wait
          const minutesUntilEnd = minutesUntilQuietHoursEnd(activePolicy)
          if (minutesUntilEnd !== null) {
            const waitUntil = new Date(now.getTime() + minutesUntilEnd * 60 * 1000)
            return {
              type: 'WAIT',
              until: waitUntil.toISOString(),
              reason: 'Quiet hours active. Escalation deferred.',
              trace: createTrace(context, 'sev2_quiet_hours_wait', inQuietHours, activePolicy, metadata)
            }
          }
        }
      } else {
        // Not in quiet hours, escalate silently
        return {
          type: 'SEND_SILENT_SMS',
          messageType: 'update',
          trace: createTrace(context, 'sev2_interval_escalation', inQuietHours, activePolicy, metadata)
        }
      }
    }
  } else {
    // Not time for escalation yet
    const waitMinutes = nextInterval - minutesSinceLast
    const waitUntil = new Date(now.getTime() + waitMinutes * 60 * 1000)
    return {
      type: 'WAIT',
      until: waitUntil.toISOString(),
      reason: `Next escalation in ${waitMinutes} minutes`,
      trace: createTrace(context, 'interval_wait', inQuietHours, activePolicy, metadata)
    }
  }

  // Default: do not notify
  return {
    type: 'DO_NOT_NOTIFY',
    reason: 'No escalation needed at this time',
      trace: createTrace(context, 'default_no_notify', inQuietHours, activePolicy, metadata)
  }
}


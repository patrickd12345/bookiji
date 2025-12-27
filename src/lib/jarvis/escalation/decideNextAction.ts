/**
 * Escalation Decision Engine
 * 
 * Deterministic logic to decide when and how to notify.
 * No LLM. Pure function.
 */

import {
  getSleepPolicy,
  isInQuietHours,
  minutesUntilQuietHoursEnd,
  sanitizeNotificationCap,
  SeveritySleepRule
} from './sleepPolicy'
import { logger } from '@/lib/logger'
import type { Severity } from '../types'

const DECISION_MESSAGE_CONSTRAINTS = {
  DO_NOT_NOTIFY: null,
  SEND_SILENT_SMS: ['informational', 'update'],
  SEND_LOUD_SMS: ['wake', 'escalation'],
  WAIT: null
} as const

export const ALLOWED_ESCALATION_DECISIONS = Object.keys(
  DECISION_MESSAGE_CONSTRAINTS
) as Array<keyof typeof DECISION_MESSAGE_CONSTRAINTS>

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

function assertValidDecision(decision: EscalationDecision): void {
  const constraints = DECISION_MESSAGE_CONSTRAINTS[decision.type]

  if (constraints === undefined) {
    throw new Error(`[Jarvis] Invalid decision type: ${decision.type}`)
  }

  if (constraints !== null) {
    if (!('messageType' in decision)) {
      throw new Error(`[Jarvis] Decision ${decision.type} must include a messageType`)
    }
    const allowedTypes = constraints as readonly string[]
    if (!allowedTypes.includes(decision.messageType)) {
      throw new Error(
        `[Jarvis] Decision ${decision.type} has unexpected messageType ${decision.messageType}`
      )
    }
  } else if ('messageType' in decision) {
    throw new Error(`[Jarvis] Decision ${decision.type} must not include a messageType`)
  }
}

function finalizeDecision(decision: EscalationDecision): EscalationDecision {
  assertValidDecision(decision)
  return decision
}

/**
 * Create base trace object
 */
function createTrace(
  context: EscalationContext,
  ruleFired: string,
  inQuietHours: boolean,
  cap: number,
  policyMetadata?: { policy_id: string; version: string; checksum: string }
): DecisionTrace {
  const trace: DecisionTrace = {
    severity: context.severity,
    quiet_hours: inQuietHours,
    notifications_sent: context.notificationCount,
    cap,
    rule_fired: ruleFired
  }

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
  const sanitizedCap = sanitizeNotificationCap(activePolicy.maxNotificationsPerIncident)

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
      logger.warn('[Jarvis] Could not load policy metadata', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  const severityRule: SeveritySleepRule = activePolicy.severityRules[context.severity]
  if (!severityRule) {
    throw new Error(`[Jarvis] Missing severity rule for ${context.severity}`)
  }

  const traceFor = (rule: string) => createTrace(context, rule, inQuietHours, sanitizedCap, metadata)
  const canWakeInQuietHours = severityRule.wakeDuringQuietHours
  const maxSilentMinutes = severityRule.maxSilentMinutes
  const intervals = severityRule.escalationIntervalsMinutes || []

  // Rule 1: If acknowledged, do not notify
  if (context.acknowledgedAt) {
    return finalizeDecision({
      type: 'DO_NOT_NOTIFY',
      reason: 'Incident acknowledged by owner',
      trace: traceFor('acknowledged_no_notify')
    })
  }

  // Rule 2: Hard cap on notifications
  if (context.notificationCount >= sanitizedCap) {
    return finalizeDecision({
      type: 'DO_NOT_NOTIFY',
      reason: `Maximum notifications (${sanitizedCap}) reached`,
      trace: traceFor('cap_reached')
    })
  }

  // Rule 3: First notification logic
  if (!context.firstNotifiedAt) {
    if (context.severity === 'SEV-3') {
      return finalizeDecision({
        type: 'DO_NOT_NOTIFY',
        reason: 'SEV-3 incidents do not trigger notifications',
        trace: traceFor('sev3_no_notification')
      })
    }

    if (inQuietHours && !canWakeInQuietHours) {
      const minutesUntilEnd = minutesUntilQuietHoursEnd(activePolicy)
      if (minutesUntilEnd !== null) {
        const waitUntil = new Date(now.getTime() + minutesUntilEnd * 60 * 1000)
        return finalizeDecision({
          type: 'WAIT',
          until: waitUntil.toISOString(),
          reason: `Quiet hours active. Will notify after ${activePolicy.quietHours.end}`,
          trace: traceFor('quiet_hours_first_wait')
        })
      }
      const fallbackUntil = new Date(now.getTime() + 5 * 60 * 1000)
      return finalizeDecision({
        type: 'WAIT',
        until: fallbackUntil.toISOString(),
        reason: 'Quiet hours active; waiting for next check.',
        trace: traceFor('quiet_hours_first_wait_unknown_end')
      })
    }

    if (canWakeInQuietHours) {
      return finalizeDecision({
        type: 'SEND_LOUD_SMS',
        messageType: 'wake',
        trace: traceFor('first_notification_wake')
      })
    }

    return finalizeDecision({
      type: 'SEND_SILENT_SMS',
      messageType: 'informational',
      trace: traceFor('first_notification_silent')
    })
  }

  // Rule 4: Escalation logic (after first notification)
  const firstNotified = new Date(context.firstNotifiedAt)
  const minutesSinceFirst = Math.floor((now.getTime() - firstNotified.getTime()) / (1000 * 60))

  if (typeof maxSilentMinutes === 'number' && minutesSinceFirst >= maxSilentMinutes) {
    return finalizeDecision({
      type: 'SEND_LOUD_SMS',
      messageType: 'escalation',
      trace: traceFor('max_silent_minutes_exceeded')
    })
  }

  if (intervals.length === 0) {
    return finalizeDecision({
      type: 'DO_NOT_NOTIFY',
      reason: `${context.severity} has no escalation intervals configured`,
      trace: traceFor('no_escalation_intervals')
    })
  }

  const currentLevel = Math.max(0, context.escalationLevel)
  const intervalIndex = Math.min(currentLevel, intervals.length - 1)
  const nextInterval = intervals[intervalIndex]

  const lastNotified = context.lastNotifiedAt ? new Date(context.lastNotifiedAt) : firstNotified
  const minutesSinceLast = Math.floor((now.getTime() - lastNotified.getTime()) / (1000 * 60))

  if (minutesSinceLast >= nextInterval) {
    if (inQuietHours && !canWakeInQuietHours) {
      if (typeof maxSilentMinutes === 'number' && minutesSinceFirst >= maxSilentMinutes) {
        return finalizeDecision({
          type: 'SEND_LOUD_SMS',
          messageType: 'escalation',
          trace: traceFor('quiet_hours_max_silent_escalation')
        })
      }

      const minutesUntilEnd = minutesUntilQuietHoursEnd(activePolicy)
      if (minutesUntilEnd !== null) {
        const waitUntil = new Date(now.getTime() + minutesUntilEnd * 60 * 1000)
        return finalizeDecision({
          type: 'WAIT',
          until: waitUntil.toISOString(),
          reason: 'Quiet hours active. Escalation deferred.',
          trace: traceFor('quiet_hours_escalation_wait')
        })
      }

      const fallbackUntil = new Date(now.getTime() + 5 * 60 * 1000)
      return finalizeDecision({
        type: 'WAIT',
        until: fallbackUntil.toISOString(),
        reason: 'Quiet hours active; waiting for next check.',
        trace: traceFor('quiet_hours_escalation_wait_unknown_end')
      })
    }

    if (canWakeInQuietHours) {
      return finalizeDecision({
        type: 'SEND_LOUD_SMS',
        messageType: 'escalation',
        trace: traceFor('interval_escalation_loud')
      })
    }

    return finalizeDecision({
      type: 'SEND_SILENT_SMS',
      messageType: 'update',
      trace: traceFor('interval_escalation_silent')
    })
  }

  const waitMinutes = nextInterval - minutesSinceLast
  const waitUntil = new Date(now.getTime() + waitMinutes * 60 * 1000)
  return finalizeDecision({
    type: 'WAIT',
    until: waitUntil.toISOString(),
    reason: `Next escalation in ${waitMinutes} minutes`,
    trace: traceFor('interval_wait')
  })
}

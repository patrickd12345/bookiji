/**
 * Sleep Policy Model
 * 
 * Static, versioned sleep policies.
 * Deterministic. No user input at runtime.
 */

import { DEFAULT_POLICY_CONFIG } from '../policy/types'
import { logger, errorToContext } from '@/lib/logger'
import type { PolicyConfig } from '../policy/types'
import type { Severity } from '../types'

export interface SeveritySleepRule {
  wakeDuringQuietHours: boolean
  maxSilentMinutes: number | null
  escalationIntervalsMinutes: number[]
}

export type SeverityRuleMap = Record<Severity, SeveritySleepRule>

export interface SleepPolicy {
  id: string
  version: string
  quietHours: {
    start: string // "22:00"
    end: string   // "07:00"
    timezone: string // "America/New_York"
  }
  wakeThresholdSeverity: 'SEV-1' | 'SEV-0' // Only SEV-1+ can wake during quiet hours
  maxSilentMinutes: number // Max time before escalation even in quiet hours (SEV-1 fallback)
  escalationIntervalsMinutes: number[] // [15, 30, 60, 120] - intervals between escalations (SEV-1 fallback)
  maxNotificationsPerIncident: number // Hard cap to prevent spam
  severityRules: SeverityRuleMap
}

export const GLOBAL_MAX_NOTIFICATION_CAP = 5

const SEVERITIES: Severity[] = ['SEV-1', 'SEV-2', 'SEV-3']

/**
 * Normalize severity rules from a policy config.
 * Falls back to DEFAULT_POLICY_CONFIG when fields are missing.
 */
export function mapPolicyConfigToSeverityRules(config: PolicyConfig): SeverityRuleMap {
  const baseline = config.severity_rules || DEFAULT_POLICY_CONFIG.severity_rules
  const rules: Partial<SeverityRuleMap> = {}

  for (const severity of SEVERITIES) {
    const rule = baseline[severity] || DEFAULT_POLICY_CONFIG.severity_rules[severity]
    rules[severity] = {
      wakeDuringQuietHours: Boolean(rule?.wake_during_quiet_hours),
      maxSilentMinutes: rule?.max_silent_minutes ?? null,
      escalationIntervalsMinutes: Array.isArray(rule?.escalation_intervals_minutes)
        ? rule!.escalation_intervals_minutes
        : []
    }
  }

  return rules as SeverityRuleMap
}

export function sanitizeNotificationCap(cap: number): number {
  if (!Number.isFinite(cap)) {
    return GLOBAL_MAX_NOTIFICATION_CAP
  }

  return Math.min(Math.max(cap, 1), GLOBAL_MAX_NOTIFICATION_CAP)
}

const DEFAULT_SEVERITY_RULES = mapPolicyConfigToSeverityRules(DEFAULT_POLICY_CONFIG)

/**
 * Default sleep policy (OWNER_DEFAULT_V1)
 */
export const OWNER_DEFAULT_V1: SleepPolicy = {
  id: 'OWNER_DEFAULT_V1',
  version: '1.0.0',
  quietHours: {
    start: '22:00',
    end: '07:00',
    timezone: process.env.JARVIS_OWNER_TIMEZONE || 'America/New_York'
  },
  wakeThresholdSeverity: 'SEV-1', // Only SEV-1 can wake during quiet hours
  maxSilentMinutes: DEFAULT_SEVERITY_RULES['SEV-1'].maxSilentMinutes ?? 120, // 2 hours max silence even in quiet hours for SEV-1
  escalationIntervalsMinutes: DEFAULT_SEVERITY_RULES['SEV-1'].escalationIntervalsMinutes,
  maxNotificationsPerIncident: 5, // Hard cap: never send more than 5 SMS per incident
  severityRules: DEFAULT_SEVERITY_RULES
}

/**
 * Get active sleep policy
 * 
 * Phase 5: Now uses policy from database registry.
 * Falls back to default if no active policy exists.
 */
export async function getSleepPolicy(): Promise<SleepPolicy> {
  // Check if Phase 5 is enabled
  const phase5Enabled = process.env.JARVIS_PHASE5_SIMULATION_ENABLED === 'true'
  
  if (phase5Enabled) {
    try {
      const { getActivePolicyConfig, policyConfigToSleepPolicy } = await import('../policy/adapter')
      const config = await getActivePolicyConfig()
      return policyConfigToSleepPolicy(config)
    } catch (error) {
      logger.error('[Jarvis] Error loading active policy, falling back to default', errorToContext(error))
      return OWNER_DEFAULT_V1
    }
  }
  
  // Phase 5 disabled - use default
  return OWNER_DEFAULT_V1
}

/**
 * Check if current time is in quiet hours
 */
export function isInQuietHours(policy: SleepPolicy): boolean {
  try {
    const now = new Date()
    const timezone = policy.quietHours.timezone
    
    // Get current time in owner's timezone
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: timezone
    })
    
    const start = policy.quietHours.start
    const end = policy.quietHours.end
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      // Overnight: quiet hours span midnight
      return currentTime >= start || currentTime <= end
    } else {
      // Same day: quiet hours within same day
      return currentTime >= start && currentTime <= end
    }
  } catch (error) {
    // If timezone check fails, assume not in quiet hours (fail open)
    logger.error('[Jarvis] Error checking quiet hours', { ...errorToContext(error), timezone: policy.quietHours.timezone })
    return false
  }
}

/**
 * Get minutes until quiet hours end
 */
export function minutesUntilQuietHoursEnd(policy: SleepPolicy): number | null {
  if (!isInQuietHours(policy)) {
    return null
  }

  try {
    const now = new Date()
    const timezone = policy.quietHours.timezone
    
    // Parse end time
    const [endHour, endMinute] = policy.quietHours.end.split(':').map(Number)
    
    // Get current time in timezone
    const currentTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const endTime = new Date(currentTime)
    endTime.setHours(endHour, endMinute, 0, 0)
    
    // If end time is before current time, it's tomorrow
    if (endTime <= currentTime) {
      endTime.setDate(endTime.getDate() + 1)
    }
    
    const diffMs = endTime.getTime() - currentTime.getTime()
    return Math.floor(diffMs / (1000 * 60))
  } catch (error) {
    logger.error('[Jarvis] Error calculating quiet hours end', { ...errorToContext(error), timezone: policy.quietHours.timezone })
    return null
  }
}

/**
 * Jarvis Phase 5 - Policy Adapter
 * 
 * Adapts PolicyConfig to the format expected by decision engine.
 * Provides backward compatibility with existing SleepPolicy interface.
 */

import { getActivePolicy } from './registry'
import type { PolicyConfig } from './types'
import type { SleepPolicy } from '../escalation/sleepPolicy'

/**
 * Convert PolicyConfig to SleepPolicy format (for backward compatibility)
 */
export function policyConfigToSleepPolicy(config: PolicyConfig): SleepPolicy {
  // Use SEV-1 rules as defaults (most permissive)
  const sev1Rules = config.severity_rules['SEV-1']
  
  return {
    id: 'active_policy',
    version: '1.0.0', // Will be replaced with actual policy version
    quietHours: {
      start: config.quiet_hours.start,
      end: config.quiet_hours.end,
      timezone: config.quiet_hours.timezone
    },
    wakeThresholdSeverity: sev1Rules.wake_during_quiet_hours ? 'SEV-1' : 'SEV-0',
    maxSilentMinutes: sev1Rules.max_silent_minutes || 120,
    escalationIntervalsMinutes: sev1Rules.escalation_intervals_minutes,
    maxNotificationsPerIncident: config.notification_cap
  }
}

/**
 * Get severity-specific rules from policy
 */
export function getSeverityRules(config: PolicyConfig, severity: 'SEV-1' | 'SEV-2' | 'SEV-3') {
  return config.severity_rules[severity]
}

/**
 * Get active policy config (cached for performance)
 */
let cachedPolicy: { policy: PolicyConfig; timestamp: number } | null = null
const CACHE_TTL_MS = 60000 // 1 minute cache

export async function getActivePolicyConfig(): Promise<PolicyConfig> {
  const now = Date.now()
  
  // Return cached policy if still valid
  if (cachedPolicy && (now - cachedPolicy.timestamp) < CACHE_TTL_MS) {
    return cachedPolicy.policy
  }

  // Fetch fresh policy
  const policyRecord = await getActivePolicy()
  cachedPolicy = {
    policy: policyRecord.policy_json,
    timestamp: now
  }

  return cachedPolicy.policy
}

/**
 * Clear policy cache (call after policy activation)
 */
export function clearPolicyCache(): void {
  cachedPolicy = null
}

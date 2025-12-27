/**
 * Jarvis Phase 5 - Policy Definition Types
 * 
 * Policy configuration structure for versioned, deterministic escalation behavior.
 */

export type PolicyStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type ChangeStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'APPLIED'
export type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3'

/**
 * Policy JSON structure - defines escalation behavior
 */
export interface PolicyConfig {
  notification_cap: number // MUST be <= 5 (invariant)
  quiet_hours: {
    start: string // "22:00"
    end: string   // "07:00"
    timezone: string // "America/New_York"
  }
  severity_rules: {
    [K in Severity]: SeverityRule
  }
}

export interface SeverityRule {
  allowed_channels: string[] // ["sms", "push", "email"]
  wake_during_quiet_hours: boolean
  max_silent_minutes: number | null // Max time before escalation even in quiet hours
  escalation_intervals_minutes: number[] // [15, 30, 60, 120]
}

/**
 * Policy record from database
 */
export interface PolicyRecord {
  id: string
  policy_id: string
  name: string
  version: string
  status: PolicyStatus
  created_at: string
  created_by: string | null
  policy_json: PolicyConfig
  checksum: string
  description: string | null
}

/**
 * Policy change record
 */
export interface PolicyChangeRecord {
  id: string
  change_id: string
  from_policy_id: string | null
  to_policy_id: string
  created_at: string
  created_by: string
  status: ChangeStatus
  approved_at: string | null
  approved_by: string | null
  applied_at: string | null
  applied_by: string | null
  notes: string | null
  rejection_reason: string | null
}

/**
 * Default policy configuration (matches current OWNER_DEFAULT_V1)
 */
export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  notification_cap: 5,
  quiet_hours: {
    start: '22:00',
    end: '07:00',
    timezone: process.env.JARVIS_OWNER_TIMEZONE || 'America/New_York'
  },
  severity_rules: {
    'SEV-1': {
      allowed_channels: ['sms'],
      wake_during_quiet_hours: true,
      max_silent_minutes: 120,
      escalation_intervals_minutes: [15, 30, 60, 120]
    },
    'SEV-2': {
      allowed_channels: ['sms'],
      wake_during_quiet_hours: false,
      max_silent_minutes: 120,
      escalation_intervals_minutes: [15, 30, 60, 120]
    },
    'SEV-3': {
      allowed_channels: [],
      wake_during_quiet_hours: false,
      max_silent_minutes: null,
      escalation_intervals_minutes: []
    }
  }
}

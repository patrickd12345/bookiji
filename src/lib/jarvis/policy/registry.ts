/**
 * Jarvis Phase 5 - Policy Registry
 * 
 * Manages policy storage and retrieval.
 * Provides access to ACTIVE policy for decision engine.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import { createHash } from 'crypto'
import type { PolicyRecord, PolicyConfig, PolicyStatus } from './types'
import { DEFAULT_POLICY_CONFIG } from './types'

/**
 * Compute checksum for policy JSON
 */
export function computePolicyChecksum(policyJson: PolicyConfig): string {
  const jsonString = JSON.stringify(policyJson, Object.keys(policyJson).sort())
  return createHash('sha256').update(jsonString).digest('hex')
}

/**
 * Get active policy from database
 * Falls back to default if no active policy exists
 */
export async function getActivePolicy(): Promise<PolicyRecord> {
  const supabase = getServerSupabase()
  
  const { data, error } = await supabase
    .from('jarvis_policies')
    .select('*')
    .eq('status', 'ACTIVE')
    .single()

  if (error || !data) {
    // No active policy - return default policy record (virtual)
    // In production, we should ensure a default policy is seeded
    return {
      id: 'default',
      policy_id: 'OWNER_DEFAULT_V1',
      name: 'Default Policy',
      version: '1.0.0',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      created_by: 'system',
      policy_json: DEFAULT_POLICY_CONFIG,
      checksum: computePolicyChecksum(DEFAULT_POLICY_CONFIG),
      description: 'Default policy (fallback)'
    }
  }

  return data as PolicyRecord
}

/**
 * Get policy by ID
 */
export async function getPolicyById(policyId: string): Promise<PolicyRecord | null> {
  const supabase = getServerSupabase()
  
  const { data, error } = await supabase
    .from('jarvis_policies')
    .select('*')
    .eq('policy_id', policyId)
    .single()

  if (error || !data) {
    return null
  }

  return data as PolicyRecord
}

/**
 * Get policy by database UUID
 */
export async function getPolicyByUuid(id: string): Promise<PolicyRecord | null> {
  const supabase = getServerSupabase()
  
  const { data, error } = await supabase
    .from('jarvis_policies')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data as PolicyRecord
}

/**
 * Create a new policy (DRAFT status)
 */
export async function createPolicy(
  policyId: string,
  name: string,
  version: string,
  policyJson: PolicyConfig,
  createdBy: string,
  description?: string
): Promise<PolicyRecord> {
  const supabase = getServerSupabase()
  
  const checksum = computePolicyChecksum(policyJson)
  
  const { data, error } = await supabase
    .from('jarvis_policies')
    .insert({
      policy_id: policyId,
      name,
      version,
      status: 'DRAFT',
      created_by: createdBy,
      policy_json: policyJson,
      checksum,
      description: description || null
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create policy: ${error.message}`)
  }

  return data as PolicyRecord
}

/**
 * List policies by status
 */
export async function listPolicies(status?: PolicyStatus): Promise<PolicyRecord[]> {
  const supabase = getServerSupabase()
  
  let query = supabase
    .from('jarvis_policies')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list policies: ${error.message}`)
  }

  return (data || []) as PolicyRecord[]
}

/**
 * Validate policy configuration
 * Returns array of validation errors (empty if valid)
 */
export function validatePolicyConfig(config: PolicyConfig): string[] {
  const errors: string[] = []

  // Invariant: notification_cap <= 5
  if (config.notification_cap > 5) {
    errors.push(`notification_cap must be <= 5, got ${config.notification_cap}`)
  }

  if (config.notification_cap < 1) {
    errors.push(`notification_cap must be >= 1, got ${config.notification_cap}`)
  }

  // Validate quiet_hours
  if (!config.quiet_hours.start || !config.quiet_hours.end) {
    errors.push('quiet_hours must have start and end')
  }

  if (!config.quiet_hours.timezone) {
    errors.push('quiet_hours must have timezone')
  }

  // Validate severity_rules structure
  if (!config.severity_rules || typeof config.severity_rules !== 'object') {
    errors.push('severity_rules must be an object')
    return errors
  }

  // Validate severity rules
  const severities: Array<Severity> = ['SEV-1', 'SEV-2', 'SEV-3']
  for (const severity of severities) {
    const rule = config.severity_rules[severity]
    if (!rule) {
      errors.push(`severity_rules: Missing severity rule for ${severity}`)
      continue
    }

    if (!Array.isArray(rule.allowed_channels)) {
      errors.push(`${severity}.allowed_channels must be an array`)
    }

    if (typeof rule.wake_during_quiet_hours !== 'boolean') {
      errors.push(`${severity}.wake_during_quiet_hours must be boolean`)
    }

    if (rule.max_silent_minutes !== null && (typeof rule.max_silent_minutes !== 'number' || rule.max_silent_minutes < 0)) {
      errors.push(`${severity}.max_silent_minutes must be null or non-negative number`)
    }

    if (!Array.isArray(rule.escalation_intervals_minutes)) {
      errors.push(`${severity}.escalation_intervals_minutes must be an array`)
    }
  }

  return errors
}

type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3'

/**
 * Jarvis Phase 5 - Approval Workflow
 * 
 * Manages policy change approval and activation workflow.
 * Human-in-the-loop: all policy changes require explicit approval.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import { getPolicyByUuid, getActivePolicy, validatePolicyConfig } from './registry'
import { clearPolicyCache } from './adapter'
import type { PolicyChangeRecord, ChangeStatus } from './types'

/**
 * Create a policy change proposal
 */
export async function proposePolicyChange(
  fromPolicyId: string | null,
  toPolicyId: string,
  createdBy: string,
  notes?: string
): Promise<PolicyChangeRecord> {
  const supabase = getServerSupabase()

  // Validate target policy
  const toPolicy = await getPolicyByUuid(toPolicyId)
  if (!toPolicy) {
    throw new Error(`Target policy not found: ${toPolicyId}`)
  }

  // Validate policy config
  const validationErrors = validatePolicyConfig(toPolicy.policy_json)
  if (validationErrors.length > 0) {
    throw new Error(`Invalid policy config: ${validationErrors.join(', ')}`)
  }

  // Create change record
  const changeId = `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const { data, error } = await supabase
    .from('jarvis_policy_changes')
    .insert({
      change_id: changeId,
      from_policy_id: fromPolicyId,
      to_policy_id: toPolicyId,
      created_by: createdBy,
      status: 'PROPOSED',
      notes: notes || null
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create policy change: ${error.message}`)
  }

  return data as PolicyChangeRecord
}

/**
 * Approve a policy change
 */
export async function approvePolicyChange(
  changeId: string,
  approvedBy: string
): Promise<PolicyChangeRecord> {
  const supabase = getServerSupabase()

  // Get change record
  const { data: change, error: fetchError } = await supabase
    .from('jarvis_policy_changes')
    .select('*')
    .eq('change_id', changeId)
    .single()

  if (fetchError || !change) {
    throw new Error(`Policy change not found: ${changeId}`)
  }

  if (change.status !== 'PROPOSED') {
    throw new Error(`Policy change is not in PROPOSED status: ${change.status}`)
  }

  // Update to APPROVED
  const { data: updated, error: updateError } = await supabase
    .from('jarvis_policy_changes')
    .update({
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy
    })
    .eq('change_id', changeId)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to approve policy change: ${updateError.message}`)
  }

  return updated as PolicyChangeRecord
}

/**
 * Reject a policy change
 */
export async function rejectPolicyChange(
  changeId: string,
  rejectedBy: string,
  reason: string
): Promise<PolicyChangeRecord> {
  const supabase = getServerSupabase()

  const { data: updated, error } = await supabase
    .from('jarvis_policy_changes')
    .update({
      status: 'REJECTED',
      rejection_reason: reason
    })
    .eq('change_id', changeId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to reject policy change: ${error.message}`)
  }

  return updated as PolicyChangeRecord
}

/**
 * Activate an approved policy change
 * 
 * CRITICAL: This atomically deactivates the current ACTIVE policy
 * and activates the new one. Must be called within a transaction.
 */
export async function activatePolicyChange(
  changeId: string,
  appliedBy: string
): Promise<{ oldPolicy: string; newPolicy: string }> {
  const supabase = getServerSupabase()

  // Get change record
  const { data: change, error: fetchError } = await supabase
    .from('jarvis_policy_changes')
    .select('*')
    .eq('change_id', changeId)
    .single()

  if (fetchError || !change) {
    throw new Error(`Policy change not found: ${changeId}`)
  }

  if (change.status !== 'APPROVED') {
    throw new Error(`Policy change must be APPROVED before activation: ${change.status}`)
  }

  // Get target policy
  const toPolicy = await getPolicyByUuid(change.to_policy_id)
  if (!toPolicy) {
    throw new Error(`Target policy not found: ${change.to_policy_id}`)
  }

  // Validate policy config
  const validationErrors = validatePolicyConfig(toPolicy.policy_json)
  if (validationErrors.length > 0) {
    throw new Error(`Invalid policy config: ${validationErrors.join(', ')}`)
  }

  // Atomic activation: deactivate old ACTIVE policy, activate new one
  // Note: Supabase doesn't support transactions in JS client, so we use a stored procedure
  // For now, we'll do it in two steps (not fully atomic, but acceptable for this use case)
  // TODO: Create a stored procedure for true atomicity

  // Step 1: Deactivate current ACTIVE policy
  const { data: activePolicy } = await supabase
    .from('jarvis_policies')
    .select('id, policy_id')
    .eq('status', 'ACTIVE')
    .single()

  if (activePolicy) {
    await supabase
      .from('jarvis_policies')
      .update({ status: 'ARCHIVED' })
      .eq('id', activePolicy.id)
  }

  // Step 2: Activate new policy
  await supabase
    .from('jarvis_policies')
    .update({ status: 'ACTIVE' })
    .eq('id', toPolicy.id)

  // Step 3: Mark change as APPLIED
  await supabase
    .from('jarvis_policy_changes')
    .update({
      status: 'APPLIED',
      applied_at: new Date().toISOString(),
      applied_by: appliedBy
    })
    .eq('change_id', changeId)

  // Clear policy cache
  clearPolicyCache()

  return {
    oldPolicy: activePolicy?.policy_id || 'none',
    newPolicy: toPolicy.policy_id
  }
}

/**
 * Get policy change by ID
 */
export async function getPolicyChange(changeId: string): Promise<PolicyChangeRecord | null> {
  const supabase = getServerSupabase()

  const { data, error } = await supabase
    .from('jarvis_policy_changes')
    .select('*')
    .eq('change_id', changeId)
    .single()

  if (error || !data) {
    return null
  }

  return data as PolicyChangeRecord
}

/**
 * List policy changes
 */
export async function listPolicyChanges(
  status?: ChangeStatus
): Promise<PolicyChangeRecord[]> {
  const supabase = getServerSupabase()

  let query = supabase
    .from('jarvis_policy_changes')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list policy changes: ${error.message}`)
  }

  return (data || []) as PolicyChangeRecord[]
}

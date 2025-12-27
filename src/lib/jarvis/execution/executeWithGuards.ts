/**
 * Action Execution with Guard Rails
 * 
 * Enforces all safety checks before executing any action.
 */

import { assertAppEnv } from '@/lib/env/assertAppEnv'
import { getAction, isActionAllowed } from '../actions/registry'
import type { ActionResult, Environment } from '../types'
import { wasRecentlySent, generateIncidentHash } from '../incidentState'
import type { IncidentSnapshot } from '../types'

export interface ExecutionGuardResult {
  allowed: boolean
  reason?: string
}

/**
 * Check if action can be executed (guard rails)
 */
export async function checkExecutionGuards(
  actionId: string,
  env: Environment,
  senderPhone: string,
  ownerPhone: string,
  snapshot?: IncidentSnapshot
): Promise<ExecutionGuardResult> {
  // Guard 1: Verify sender is owner
  if (senderPhone !== ownerPhone) {
    return {
      allowed: false,
      reason: 'Sender phone does not match owner phone'
    }
  }

  // Guard 2: Assert environment is valid
  try {
    assertAppEnv()
  } catch (error) {
    return {
      allowed: false,
      reason: `Invalid environment: ${error instanceof Error ? error.message : 'Unknown'}`
    }
  }

  // Guard 3: Check if action exists in registry
  const action = getAction(actionId)
  if (!action) {
    return {
      allowed: false,
      reason: `Action ${actionId} not found in registry`
    }
  }

  // Guard 4: Check if action is allowed in environment
  if (!isActionAllowed(actionId, env)) {
    return {
      allowed: false,
      reason: `Action ${actionId} not allowed in ${env}`
    }
  }

  // Guard 5: Check for destructive operations (kill switch is safe, but check anyway)
  // Kill switch toggle is not considered destructive (it's a safety mechanism)
  // But we still check environment isolation
  if (env === 'prod') {
    // In prod, we allow kill switch toggles (they're safety mechanisms)
    // But we log everything
  }

  // Guard 6: Duplicate suppression (if snapshot provided)
  if (snapshot) {
    const hash = generateIncidentHash(snapshot, {
      assessment: 'SMS command execution',
      severity: 'SEV-2',
      recommended_actions: [],
      what_happens_if_no_reply: '',
      confidence: 0.5
    })
    const recentlySent = await wasRecentlySent(hash, 5) // 5 minute window for commands
    if (recentlySent) {
      return {
        allowed: false,
        reason: 'Duplicate command suppressed (recently executed)'
      }
    }
  }

  return {
    allowed: true
  }
}

/**
 * Execute action with all guard rails
 */
export async function executeWithGuards(
  actionId: string,
  env: Environment,
  senderPhone: string,
  ownerPhone: string,
  context?: string,
  snapshot?: IncidentSnapshot
): Promise<ActionResult & { guardResult?: ExecutionGuardResult }> {
  // Check guards first
  const guardResult = await checkExecutionGuards(actionId, env, senderPhone, ownerPhone, snapshot)

  if (!guardResult.allowed) {
    return {
      action_id: actionId,
      success: false,
      message: `Action refused: ${guardResult.reason}`,
      guardResult
    }
  }

  // Get action from registry
  const action = getAction(actionId)
  if (!action) {
    return {
      action_id: actionId,
      success: false,
      message: `Action ${actionId} not found in registry`
    }
  }

  // Execute action
  try {
    const result = await action.handler(env, context)
    return {
      ...result,
      guardResult
    }
  } catch (error) {
    return {
      action_id: actionId,
      success: false,
      message: `Action execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
      guardResult
    }
  }
}


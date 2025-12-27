/**
 * Jarvis Action Registry
 * 
 * CRITICAL: This is the whitelist of actions Jarvis can execute.
 * 
 * Rules:
 * - If action not in registry → cannot execute
 * - No dynamic execution
 * - No string-based dispatch
 * - All actions must be explicitly defined here
 */

import type { ActionResult, Environment } from '../types'
import { disableScheduling } from './disableScheduling'
import { enableScheduling } from './enableScheduling'

export interface RegisteredAction {
  id: string
  name: string
  description: string
  allowedEnvs: Environment[]
  requiresConfirmation: boolean
  handler: (env: Environment, context?: string) => Promise<ActionResult>
}

/**
 * Action Registry - The only source of truth for executable actions
 */
export const JARVIS_ACTIONS: Record<string, RegisteredAction> = {
  DISABLE_SCHEDULING: {
    id: 'DISABLE_SCHEDULING',
    name: 'Disable Scheduling',
    description: 'Disable booking scheduling (enable kill switch)',
    allowedEnvs: ['staging', 'prod'],
    requiresConfirmation: false,
    handler: async (env, context) => {
      return await disableScheduling(env, context)
    }
  },
  ENABLE_SCHEDULING: {
    id: 'ENABLE_SCHEDULING',
    name: 'Enable Scheduling',
    description: 'Enable booking scheduling (disable kill switch)',
    allowedEnvs: ['staging', 'prod'],
    requiresConfirmation: false,
    handler: async (env, context) => {
      return await enableScheduling(env, context)
    }
  }
}

/**
 * Get action by ID
 */
export function getAction(actionId: string): RegisteredAction | undefined {
  return JARVIS_ACTIONS[actionId]
}

/**
 * Check if action is allowed in environment
 */
export function isActionAllowed(actionId: string, env: Environment): boolean {
  const action = getAction(actionId)
  if (!action) {
    return false
  }
  return action.allowedEnvs.includes(env)
}

/**
 * Get all allowed actions for environment
 */
export function getAllowedActions(env: Environment): RegisteredAction[] {
  return Object.values(JARVIS_ACTIONS).filter(action =>
    action.allowedEnvs.includes(env)
  )
}


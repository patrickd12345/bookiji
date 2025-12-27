/**
 * Action Execution Matrix
 * 
 * Pre-authorized actions Jarvis can execute without waking you.
 * Everything else waits for coffee.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import { isProduction } from '@/lib/env/assertAppEnv'
import { logger } from '@/lib/logger'
import type { AllowedAction, ActionResult, Environment } from './types'

/**
 * Get all allowed actions for current environment
 */
export function getAllowedActions(env: Environment): AllowedAction[] {
  const actions: AllowedAction[] = [
    {
      id: 'enable_scheduling',
      name: 'Enable Scheduling',
      description: 'Enable booking scheduling (disable kill switch)',
      allowed_in_prod: true,
      allowed_in_staging: true,
      execute: async (targetEnv) => {
        if (targetEnv === 'prod' && !isProduction()) {
          return { action_id: 'enable_scheduling', success: false, message: 'Cannot enable in prod from non-prod environment' }
        }
        return await toggleScheduling(true)
      }
    },
    {
      id: 'disable_scheduling',
      name: 'Disable Scheduling',
      description: 'Disable booking scheduling (enable kill switch)',
      allowed_in_prod: true,
      allowed_in_staging: true,
      execute: async (targetEnv) => {
        if (targetEnv === 'prod' && !isProduction()) {
          return { action_id: 'disable_scheduling', success: false, message: 'Cannot disable in prod from non-prod environment' }
        }
        return await toggleScheduling(false)
      }
    },
    {
      id: 'capture_snapshot',
      name: 'Capture Forensic Snapshot',
      description: 'Capture current system state for analysis',
      allowed_in_prod: true,
      allowed_in_staging: true,
      execute: async () => {
        return await captureSnapshot()
      }
    }
  ]

  // Filter by environment
  return actions.filter(action => {
    if (env === 'prod') {
      return action.allowed_in_prod
    }
    if (env === 'staging') {
      return action.allowed_in_staging
    }
    return true // local allows all
  })
}

/**
 * Execute action by ID
 */
export async function executeAction(
  actionId: string,
  env: Environment
): Promise<ActionResult> {
  const actions = getAllowedActions(env)
  const action = actions.find(a => a.id === actionId)

  if (!action) {
    return {
      action_id: actionId,
      success: false,
      message: `Action ${actionId} not found or not allowed in ${env}`
    }
  }

  try {
    return await action.execute(env)
  } catch (error) {
    return {
      action_id: actionId,
      success: false,
      message: `Action execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Toggle scheduling kill switch
 */
async function toggleScheduling(enabled: boolean): Promise<ActionResult> {
  try {
    const supabase = getServerSupabase()
    
    // Get current admin user (or use service role)
    const { data: flag, error: fetchError } = await supabase
      .from('system_flags')
      .select('key, value')
      .eq('key', 'scheduling_enabled')
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return {
        action_id: 'toggle_scheduling',
        success: false,
        message: `Failed to read current state: ${fetchError.message}`
      }
    }

    // Only update if state is different
    if (flag && flag.value === enabled) {
      return {
        action_id: 'toggle_scheduling',
        success: true,
        message: `Scheduling already ${enabled ? 'enabled' : 'disabled'}`
      }
    }

    const { error: updateError } = await supabase
      .from('system_flags')
      .upsert({
        key: 'scheduling_enabled',
        value: enabled,
        reason: `Jarvis auto-action: ${enabled ? 'enabled' : 'disabled'} scheduling`,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })

    if (updateError) {
      return {
        action_id: 'toggle_scheduling',
        success: false,
        message: `Failed to update: ${updateError.message}`
      }
    }

    return {
      action_id: 'toggle_scheduling',
      success: true,
      message: `Scheduling ${enabled ? 'enabled' : 'disabled'} successfully`
    }
  } catch (error) {
    return {
      action_id: 'toggle_scheduling',
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Capture forensic snapshot
 */
async function captureSnapshot(): Promise<ActionResult> {
  try {
    // Store snapshot in database or logs
    const timestamp = new Date().toISOString()
    
    // TODO: Store in incident_logs table or similar
    logger.info('[Jarvis] Forensic snapshot captured', { timestamp })

    return {
      action_id: 'capture_snapshot',
      success: true,
      message: `Forensic snapshot captured at ${timestamp}`
    }
  } catch (error) {
    return {
      action_id: 'capture_snapshot',
      success: false,
      message: `Failed to capture snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


/**
 * Disable Scheduling Action
 * 
 * Reuses existing kill switch logic from admin cockpit.
 * No duplicated logic.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import { assertAppEnv, isProduction } from '@/lib/env/assertAppEnv'
import type { ActionResult, Environment } from '../types'

/**
 * Disable scheduling kill switch
 */
export async function disableScheduling(
  env: Environment,
  context?: string
): Promise<ActionResult> {
  try {
    // Assert environment is valid
    assertAppEnv()

    // Verify we're in the right environment
    if (env === 'prod' && !isProduction()) {
      return {
        action_id: 'DISABLE_SCHEDULING',
        success: false,
        message: 'Cannot disable scheduling in prod from non-prod environment'
      }
    }

    const supabase = getServerSupabase()
    
    // Get current state
    const { data: flag, error: fetchError } = await supabase
      .from('system_flags')
      .select('key, value')
      .eq('key', 'scheduling_enabled')
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return {
        action_id: 'DISABLE_SCHEDULING',
        success: false,
        message: `Failed to read current state: ${fetchError.message}`
      }
    }

    // Check if already disabled
    if (flag && flag.value === false) {
      return {
        action_id: 'DISABLE_SCHEDULING',
        success: true,
        message: 'Scheduling already disabled'
      }
    }

    // Build reason
    const reason = context
      ? `Jarvis SMS command: ${context}`
      : 'Jarvis SMS command: Disable scheduling'

    // Update flag (same logic as admin cockpit)
    const { error: updateError } = await supabase
      .from('system_flags')
      .upsert({
        key: 'scheduling_enabled',
        value: false,
        reason: reason.trim(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })

    if (updateError) {
      return {
        action_id: 'DISABLE_SCHEDULING',
        success: false,
        message: `Failed to update: ${updateError.message}`
      }
    }

    return {
      action_id: 'DISABLE_SCHEDULING',
      success: true,
      message: 'Scheduling disabled successfully'
    }
  } catch (error) {
    return {
      action_id: 'DISABLE_SCHEDULING',
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


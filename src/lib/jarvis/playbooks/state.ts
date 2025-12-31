/**
 * Playbook State Management
 * 
 * Tracks playbook execution state across SMS messages.
 * State is persisted in jarvis_incidents table.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import { logger, errorToContext } from '@/lib/logger'
import type { PlaybookState } from './types'

/**
 * Get active playbook state for a phone number
 */
export async function getActivePlaybookState(
  _ownerPhone: string
): Promise<PlaybookState | null> {
  try {
    const supabase = getServerSupabase()
    
    // Find most recent active playbook (not completed, not aborted)
    const { data, error } = await supabase
      .from('jarvis_incidents')
      .select('*')
      .eq('env', process.env.APP_ENV || 'prod')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error || !data) {
      return null
    }

    // Look for playbook state in assessment field
    for (const incident of data) {
      const assessment = incident.assessment as Record<string, unknown>
      if (assessment?.type === 'playbook' && assessment?.state) {
        const state = assessment.state as PlaybookState
        if (!state.completed && !state.aborted) {
          return state
        }
      }
    }

    return null
  } catch (error) {
    logger.error('[Jarvis] Error getting playbook state', { ...errorToContext(error), owner_phone: _ownerPhone })
    return null
  }
}

/**
 * Save playbook state
 */
export async function savePlaybookState(
  ownerPhone: string,
  state: PlaybookState
): Promise<void> {
  try {
    const supabase = getServerSupabase()
    
    // Store in jarvis_incidents table
    // Use a unique incident_id for the playbook session
    const incidentId = `playbook_${state.playbook_id}_${Date.now()}`
    
    // Create minimal snapshot for playbook
    const snapshot = {
      env: process.env.APP_ENV || 'prod',
      timestamp: new Date().toISOString(),
      type: 'playbook',
      playbook_id: state.playbook_id,
      owner_phone: ownerPhone
    }

    // Store state in assessment field
    const assessment = {
      type: 'playbook',
      playbook_id: state.playbook_id,
      playbook_version: state.playbook_version,
      state: state
    }

    await supabase.from('jarvis_incidents').upsert({
      incident_id: incidentId,
      incident_hash: `playbook_${state.playbook_id}_${state.current_step_index}`,
      env: process.env.APP_ENV || 'prod',
      severity: 'SEV-3',
      snapshot: snapshot as unknown as Record<string, unknown>,
      assessment: assessment as unknown as Record<string, unknown>,
      sent_at: state.started_at,
      replied: !state.completed && !state.aborted,
      replied_at: state.last_step_at || state.started_at,
      resolved: state.completed || state.aborted,
      resolved_at: state.completed ? state.last_step_at : state.aborted_at
    }, {
      onConflict: 'incident_id'
    })
  } catch (error) {
    logger.error('[Jarvis] Error saving playbook state', { ...errorToContext(error), owner_phone: ownerPhone, playbook_id: state.playbook_id })
    // Don't throw - state persistence failure shouldn't break execution
  }
}

/**
 * Update playbook state (for step execution)
 */
export async function updatePlaybookState(
  state: PlaybookState
): Promise<void> {
  try {
    const supabase = getServerSupabase()
    
    // Find the playbook incident record
    const { data } = await supabase
      .from('jarvis_incidents')
      .select('*')
      .eq('env', process.env.APP_ENV || 'prod')
      .order('created_at', { ascending: false })
      .limit(10)

    if (!data) {
      return
    }

    // Find matching playbook record
    for (const incident of data) {
      const assessment = incident.assessment as Record<string, unknown>
      if (assessment?.type === 'playbook' && assessment?.playbook_id === state.playbook_id) {
        // Update the state in assessment
        const updatedAssessment = {
          ...assessment,
          state: state
        }

        await supabase
          .from('jarvis_incidents')
          .update({
            assessment: updatedAssessment as unknown as Record<string, unknown>,
            replied: !state.completed && !state.aborted,
            replied_at: state.last_step_at || state.started_at,
            resolved: state.completed || state.aborted,
            resolved_at: state.completed ? state.last_step_at : state.aborted_at
          })
          .eq('incident_id', incident.incident_id)

        return
      }
    }
  } catch (error) {
    logger.error('[Jarvis] Error updating playbook state', { ...errorToContext(error), playbook_id: state.playbook_id })
  }
}


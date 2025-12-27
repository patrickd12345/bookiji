/**
 * Get Incident Snapshot for Status Queries
 * 
 * READ-ONLY: Returns the most recent incident from jarvis_incidents table.
 * No mutations, no side effects.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import { getAppEnv } from '@/lib/env/assertAppEnv'
import type { IncidentSnapshot, JarvisAssessment, Environment } from '../types'
import { getActivePlaybookState } from '../playbooks/state'
import type { PlaybookState } from '../playbooks/types'

export interface IncidentStatusSnapshot {
  incident_id: string
  incident_hash: string
  env: Environment
  severity: string
  snapshot: IncidentSnapshot
  assessment: JarvisAssessment
  sent_at: string
  replied: boolean
  replied_at?: string
  resolved: boolean
  resolved_at?: string
  time_since_start: number // minutes
  active_playbook?: PlaybookState
}

/**
 * Get the most recent incident for status queries
 */
export async function getIncidentStatusSnapshot(
  ownerPhone: string
): Promise<IncidentStatusSnapshot | null> {
  try {
    const supabase = getServerSupabase()
    const env = (getAppEnv() || 'prod') as Environment
    
    // Get most recent incident
    const { data, error } = await supabase
      .from('jarvis_incidents')
      .select('*')
      .eq('env', env)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    // Get active playbook if any
    const activePlaybook = await getActivePlaybookState(ownerPhone)

    // Calculate time since start
    const sentAt = new Date(data.sent_at)
    const now = new Date()
    const timeSinceStart = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60))

    return {
      incident_id: data.incident_id,
      incident_hash: data.incident_hash,
      env: data.env as Environment,
      severity: data.severity,
      snapshot: data.snapshot as unknown as IncidentSnapshot,
      assessment: data.assessment as unknown as JarvisAssessment,
      sent_at: data.sent_at,
      replied: data.replied,
      replied_at: data.replied_at || undefined,
      resolved: data.resolved,
      resolved_at: data.resolved_at || undefined,
      time_since_start: timeSinceStart,
      active_playbook: activePlaybook || undefined
    }
  } catch (error) {
    console.error('[Jarvis] Error getting incident status snapshot:', error)
    return null
  }
}

/**
 * Get previous incident for comparison (CHANGES command)
 */
export async function getPreviousIncident(
  currentIncidentId: string,
  env: Environment
): Promise<IncidentStatusSnapshot | null> {
  try {
    const supabase = getServerSupabase()
    
    // Get incident before current one
    const { data, error } = await supabase
      .from('jarvis_incidents')
      .select('*')
      .eq('env', env)
      .neq('incident_id', currentIncidentId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    const sentAt = new Date(data.sent_at)
    const now = new Date()
    const timeSinceStart = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60))

    return {
      incident_id: data.incident_id,
      incident_hash: data.incident_hash,
      env: data.env as Environment,
      severity: data.severity,
      snapshot: data.snapshot as unknown as IncidentSnapshot,
      assessment: data.assessment as unknown as JarvisAssessment,
      sent_at: data.sent_at,
      replied: data.replied,
      replied_at: data.replied_at || undefined,
      resolved: data.resolved,
      resolved_at: data.resolved_at || undefined,
      time_since_start: timeSinceStart
    }
  } catch (error) {
    console.error('[Jarvis] Error getting previous incident:', error)
    return null
  }
}


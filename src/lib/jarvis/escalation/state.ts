/**
 * Escalation State Management
 * 
 * Tracks escalation state for incidents.
 * Read and update escalation metadata.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import type { EscalationContext } from './decideNextAction'
import { storeAcknowledged } from '../observability/events'
import { generateAndStoreSummary } from '../observability/summary'

/**
 * Get escalation context for incident
 */
export async function getEscalationContext(
  incidentId: string
): Promise<EscalationContext | null> {
  try {
    const supabase = getServerSupabase()
    
    const { data, error } = await supabase
      .from('jarvis_incidents')
      .select('severity, first_notified_at, last_notified_at, escalation_level, acknowledged_at, notification_count')
      .eq('incident_id', incidentId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      severity: data.severity as 'SEV-1' | 'SEV-2' | 'SEV-3',
      firstNotifiedAt: data.first_notified_at || null,
      lastNotifiedAt: data.last_notified_at || null,
      escalationLevel: data.escalation_level || 0,
      acknowledgedAt: data.acknowledged_at || null,
      notificationCount: data.notification_count || 0
    }
  } catch (error) {
    console.error('[Jarvis] Error getting escalation context:', error)
    return null
  }
}

/**
 * Update escalation state after notification
 */
export async function updateEscalationAfterNotification(
  incidentId: string,
  isFirstNotification: boolean
): Promise<void> {
  try {
    const supabase = getServerSupabase()
    const now = new Date().toISOString()
    
    // Get current values first
    const { data: current } = await supabase
      .from('jarvis_incidents')
      .select('notification_count, escalation_level')
      .eq('incident_id', incidentId)
      .single()

    const updateData: Record<string, unknown> = {
      last_notified_at: now,
      notification_count: (current?.notification_count || 0) + 1
    }

    if (isFirstNotification) {
      updateData.first_notified_at = now
      updateData.escalation_level = 0
    } else {
      // Increment escalation level
      updateData.escalation_level = (current?.escalation_level || 0) + 1
    }

    await supabase
      .from('jarvis_incidents')
      .update(updateData)
      .eq('incident_id', incidentId)
  } catch (error) {
    console.error('[Jarvis] Error updating escalation state:', error)
    // Don't throw - escalation tracking failure shouldn't break notification
  }
}

/**
 * Mark incident as acknowledged
 */
export async function markIncidentAcknowledged(incidentId: string): Promise<void> {
  try {
    const supabase = getServerSupabase()
    const now = new Date().toISOString()
    
    await supabase
      .from('jarvis_incidents')
      .update({
        acknowledged_at: now
      })
      .eq('incident_id', incidentId)
    
    // Store acknowledged event
    await storeAcknowledged(incidentId, now)
  } catch (error) {
    console.error('[Jarvis] Error marking incident as acknowledged:', error)
  }
}

/**
 * Get unacknowledged incidents that may need escalation
 */
export async function getUnacknowledgedIncidents(): Promise<Array<{
  incident_id: string
  severity: string
  first_notified_at: string
  last_notified_at: string | null
  escalation_level: number
  notification_count: number
}>> {
  try {
    const supabase = getServerSupabase()
    
    const { data, error } = await supabase
      .from('jarvis_incidents')
      .select('incident_id, severity, first_notified_at, last_notified_at, escalation_level, notification_count')
      .is('acknowledged_at', null)
      .eq('resolved', false)
      .order('first_notified_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('[Jarvis] Error getting unacknowledged incidents:', error)
      return []
    }

    return (data || []).map(incident => ({
      incident_id: incident.incident_id,
      severity: incident.severity,
      first_notified_at: incident.first_notified_at,
      last_notified_at: incident.last_notified_at,
      escalation_level: incident.escalation_level || 0,
      notification_count: incident.notification_count || 0
    }))
  } catch (error) {
    console.error('[Jarvis] Error getting unacknowledged incidents:', error)
    return []
  }
}


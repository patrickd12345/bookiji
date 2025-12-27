/**
 * Incident State Management
 * 
 * Tracks ongoing incidents to prevent duplicate alerts
 * and handle no-reply scenarios
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import type { IncidentSnapshot, JarvisAssessment } from './types'
import crypto from 'crypto'
import { storeAcknowledged, storeIncidentResolved } from './observability/events'
import { generateAndStoreSummary } from './observability/summary'

/**
 * Generate incident hash for duplicate detection
 * 
 * Creates a stable hash from incident snapshot that changes
 * only when the incident state meaningfully changes
 */
export function generateIncidentHash(
  snapshot: IncidentSnapshot,
  assessment: JarvisAssessment
): string {
  // Hash key components that indicate incident state
  const hashInput = JSON.stringify({
    severity: snapshot.severity_guess,
    env: snapshot.env,
    error_rate_spike: snapshot.signals.error_rate_spike,
    booking_failures: snapshot.signals.booking_failures,
    stripe_backlog: snapshot.signals.stripe_webhook_backlog,
    invariant_violations: snapshot.signals.invariant_violations.sort(),
    kill_switch_active: snapshot.system_state.kill_switch_active,
    blast_radius: snapshot.blast_radius.sort(),
    assessment_severity: assessment.severity
  })

  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16)
}

/**
 * Check if incident was recently sent (duplicate suppression)
 * 
 * Returns true if same incident hash was sent within suppression window
 */
export async function wasRecentlySent(
  incidentHash: string,
  suppressionWindowMinutes: number = 45
): Promise<boolean> {
  try {
    const supabase = getServerSupabase()
    
    // Check for recent incident with same hash
    const windowStart = new Date(Date.now() - suppressionWindowMinutes * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('jarvis_incidents')
      .select('id, sent_at')
      .eq('incident_hash', incidentHash)
      .gte('sent_at', windowStart)
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // Error reading - fail open (allow sending)
      console.error('Error checking recent incidents:', error)
      return false
    }

    return !!data
  } catch (error) {
    // Fail open - allow sending if we can't check
    console.error('Exception checking recent incidents:', error)
    return false
  }
}

/**
 * Record incident notification
 */
export async function recordIncidentNotification(
  incidentId: string,
  incidentHash: string,
  snapshot: IncidentSnapshot,
  assessment: JarvisAssessment,
  firstNotifiedAt?: string
): Promise<void> {
  try {
    const supabase = getServerSupabase()
    const now = new Date().toISOString()
    
    // Upsert incident record
    await supabase
      .from('jarvis_incidents')
      .upsert({
        incident_id: incidentId,
        incident_hash: incidentHash,
        env: snapshot.env,
        severity: snapshot.severity_guess,
        snapshot: snapshot as unknown as Record<string, unknown>,
        assessment: assessment as unknown as Record<string, unknown>,
        sent_at: now,
        first_notified_at: firstNotifiedAt || now,
        last_notified_at: now,
        escalation_level: 0,
        notification_count: 1,
        replied: false,
        resolved: false
      }, {
        onConflict: 'incident_id'
      })
  } catch (error) {
    // Log but don't fail - notification already sent
    console.error('Error recording incident notification:', error)
  }
}

/**
 * Check for incidents awaiting reply (no-reply default action)
 */
export async function getUnrepliedIncidents(
  noReplyWindowMinutes: number = 15
): Promise<Array<{
  incident_id: string
  incident_hash: string
  sent_at: string
  snapshot: IncidentSnapshot
  assessment: JarvisAssessment
}>> {
  try {
    const supabase = getServerSupabase()
    
    const windowStart = new Date(Date.now() - noReplyWindowMinutes * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('jarvis_incidents')
      .select('*')
      .gte('sent_at', windowStart)
      .eq('replied', false)
      .eq('resolved', false)
      .order('sent_at', { ascending: false })

    if (error) {
      console.error('Error fetching unreplied incidents:', error)
      return []
    }

    return (data || []).map(incident => ({
      incident_id: incident.incident_id,
      incident_hash: incident.incident_hash,
      sent_at: incident.sent_at,
      snapshot: incident.snapshot as unknown as IncidentSnapshot,
      assessment: incident.assessment as unknown as JarvisAssessment
    }))
  } catch (error) {
    console.error('Exception fetching unreplied incidents:', error)
    return []
  }
}

/**
 * Mark incident as replied
 */
export async function markIncidentReplied(incidentId: string): Promise<void> {
  try {
    const supabase = getServerSupabase()
    const now = new Date().toISOString()
    
    await supabase
      .from('jarvis_incidents')
      .update({
        replied: true,
        replied_at: now
      })
      .eq('incident_id', incidentId)
    
    // Store acknowledged event
    await storeAcknowledged(incidentId, now)
  } catch (error) {
    console.error('Error marking incident as replied:', error)
  }
}

/**
 * Mark incident as resolved
 */
export async function markIncidentResolved(incidentId: string, terminalState: string = 'resolved'): Promise<void> {
  try {
    const supabase = getServerSupabase()
    const now = new Date().toISOString()
    
    await supabase
      .from('jarvis_incidents')
      .update({
        resolved: true,
        resolved_at: now
      })
      .eq('incident_id', incidentId)
    
    // Store incident_resolved event
    await storeIncidentResolved(incidentId, terminalState, now)
    
    // Generate and store summary
    await generateAndStoreSummary(incidentId)
  } catch (error) {
    console.error('Error marking incident as resolved:', error)
  }
}


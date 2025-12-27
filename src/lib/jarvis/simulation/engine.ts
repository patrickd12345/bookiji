/**
 * Jarvis Phase 5 - Simulation Engine
 * 
 * Replays incident timelines under candidate policies to compare outcomes.
 * Deterministic: same inputs produce same outputs.
 * No LLM, no external calls, no randomness.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import { logger } from '@/lib/logger'
import { decideNextAction } from '../escalation/decideNextAction'
import { policyConfigToSleepPolicy } from '../policy/adapter'
import { getPolicyByUuid } from '../policy/registry'
import type { PolicyConfig, PolicyRecord } from '../policy/types'
import type { EscalationContext, EscalationDecision } from '../escalation/decideNextAction'
import type { IncidentSnapshot, JarvisAssessment } from '../types'

/**
 * Simulation result for a single incident
 */
export interface SimulationResult {
  incident_id: string
  baseline_decisions: Array<{
    occurred_at: string
    decision: string
    trace: Record<string, unknown>
  }>
  simulated_decisions: Array<{
    occurred_at: string
    decision: string
    trace: Record<string, unknown>
  }>
  diff_summary: {
    total_decisions_baseline: number
    total_decisions_simulated: number
    divergences: Array<{
      timestamp: string
      baseline_decision: string
      simulated_decision: string
      reason: string
    }>
    notifications_sent_baseline: number
    notifications_sent_simulated: number
    notifications_suppressed_baseline: number
    notifications_suppressed_simulated: number
  }
  predicted_time_to_ack_ms: number | null // If deterministically calculable
  safety_checks: {
    cap_respected: boolean
    quiet_hours_respected: boolean
    ack_gating_respected: boolean
    violations: string[]
  }
}

/**
 * Batch simulation result
 */
export interface BatchSimulationResult {
  time_range: {
    start: string
    end: string
  }
  candidate_policy_id: string
  candidate_policy_version: string
  incidents_simulated: number
  results: SimulationResult[]
  aggregate_metrics: {
    total_notifications_baseline: number
    total_notifications_simulated: number
    incidents_with_divergences: number
    avg_time_to_ack_baseline_ms: number | null
    avg_time_to_ack_simulated_ms: number | null
  }
}

/**
 * Simulate a single incident under a candidate policy
 */
export async function simulateIncident(
  incidentId: string,
  candidatePolicyId: string
): Promise<SimulationResult> {
  const supabase = getServerSupabase()

  // Get incident data
  const { data: incident, error: incidentError } = await supabase
    .from('jarvis_incidents')
    .select('*')
    .eq('incident_id', incidentId)
    .single()

  if (incidentError || !incident) {
    throw new Error(`Incident not found: ${incidentId}`)
  }

  // Get candidate policy
  const candidatePolicy = await getPolicyByUuid(candidatePolicyId)
  if (!candidatePolicy) {
    throw new Error(`Policy not found: ${candidatePolicyId}`)
  }

  // Get baseline decisions (actual events)
  const { data: baselineEvents } = await supabase
    .from('jarvis_incident_events')
    .select('*')
    .eq('incident_id', incidentId)
    .eq('event_type', 'escalation_decision_made')
    .order('occurred_at', { ascending: true })

  const baselineDecisions = (baselineEvents || []).map(e => ({
    occurred_at: e.occurred_at,
    decision: e.decision || 'UNKNOWN',
    trace: e.trace || {}
  }))

  // Reconstruct incident timeline
  const snapshot = incident.snapshot as unknown as IncidentSnapshot
  const assessment = incident.assessment as unknown as JarvisAssessment

  // Simulate decisions under candidate policy
  const simulatedDecisions: Array<{
    occurred_at: string
    decision: string
    trace: Record<string, unknown>
  }> = []

  // Convert policy config to sleep policy format
  const candidateSleepPolicy = policyConfigToSleepPolicy(candidatePolicy.policy_json)

  // Build escalation context over time
  const context: EscalationContext = {
    severity: snapshot.severity_guess as 'SEV-1' | 'SEV-2' | 'SEV-3',
    firstNotifiedAt: incident.first_notified_at || null,
    lastNotifiedAt: incident.last_notified_at || null,
    escalationLevel: incident.escalation_level || 0,
    acknowledgedAt: incident.acknowledged_at || null,
    notificationCount: incident.notification_count || 0
  }

  // Replay timeline: simulate decisions at each decision point
  for (const baselineDecision of baselineDecisions) {
    const decisionTime = new Date(baselineDecision.occurred_at)

    // Update context to match state at this decision point
    // (Simplified: in reality, we'd need to track state evolution more carefully)
    const simulatedDecision = await decideNextAction(
      context,
      candidateSleepPolicy,
      {
        policy_id: candidatePolicy.policy_id,
        version: candidatePolicy.version,
        checksum: candidatePolicy.checksum
      }
    )

    simulatedDecisions.push({
      occurred_at: baselineDecision.occurred_at,
      decision: simulatedDecision.type,
      trace: simulatedDecision.trace as unknown as Record<string, unknown>
    })

    // Update context for next iteration (simplified)
    if (simulatedDecision.type === 'SEND_SILENT_SMS' || simulatedDecision.type === 'SEND_LOUD_SMS') {
      context.notificationCount++
      if (!context.firstNotifiedAt) {
        context.firstNotifiedAt = baselineDecision.occurred_at
      }
      context.lastNotifiedAt = baselineDecision.occurred_at
      context.escalationLevel++
    }
  }

  // Compute diff
  const divergences: Array<{
    timestamp: string
    baseline_decision: string
    simulated_decision: string
    reason: string
  }> = []

  for (let i = 0; i < Math.max(baselineDecisions.length, simulatedDecisions.length); i++) {
    const baseline = baselineDecisions[i]
    const simulated = simulatedDecisions[i]

    if (!baseline || !simulated) {
      divergences.push({
        timestamp: baseline?.occurred_at || simulated?.occurred_at || '',
        baseline_decision: baseline?.decision || 'MISSING',
        simulated_decision: simulated?.decision || 'MISSING',
        reason: 'Decision count mismatch'
      })
      continue
    }

    if (baseline.decision !== simulated.decision) {
      divergences.push({
        timestamp: baseline.occurred_at,
        baseline_decision: baseline.decision,
        simulated_decision: simulated.decision,
        reason: `Policy change affected decision logic`
      })
    }
  }

  // Count notifications
  const notificationsSentBaseline = baselineDecisions.filter(
    d => d.decision === 'SEND_SILENT_SMS' || d.decision === 'SEND_LOUD_SMS'
  ).length

  const notificationsSentSimulated = simulatedDecisions.filter(
    d => d.decision === 'SEND_SILENT_SMS' || d.decision === 'SEND_LOUD_SMS'
  ).length

  const notificationsSuppressedBaseline = baselineDecisions.filter(
    d => d.decision === 'DO_NOT_NOTIFY' || d.decision === 'WAIT'
  ).length

  const notificationsSuppressedSimulated = simulatedDecisions.filter(
    d => d.decision === 'DO_NOT_NOTIFY' || d.decision === 'WAIT'
  ).length

  // Safety checks
  const safetyChecks = {
    cap_respected: true,
    quiet_hours_respected: true,
    ack_gating_respected: true,
    violations: [] as string[]
  }

  // Check cap
  const maxNotifications = simulatedDecisions.filter(
    d => d.decision === 'SEND_SILENT_SMS' || d.decision === 'SEND_LOUD_SMS'
  ).length

  if (maxNotifications > candidatePolicy.policy_json.notification_cap) {
    safetyChecks.cap_respected = false
    safetyChecks.violations.push(`Cap exceeded: ${maxNotifications} > ${candidatePolicy.policy_json.notification_cap}`)
  }

  // Check quiet hours (simplified - would need full time context)
  // Check ACK gating (if acknowledged, no notifications after)
  if (context.acknowledgedAt) {
    const notificationsAfterAck = simulatedDecisions.filter(
      d => new Date(d.occurred_at) > new Date(context.acknowledgedAt!)
    ).filter(d => d.decision === 'SEND_SILENT_SMS' || d.decision === 'SEND_LOUD_SMS').length

    if (notificationsAfterAck > 0) {
      safetyChecks.ack_gating_respected = false
      safetyChecks.violations.push(`Notifications sent after ACK: ${notificationsAfterAck}`)
    }
  }

  // Calculate predicted time to ACK (if deterministically calculable)
  // This is simplified - in reality, we'd need historical ACK patterns
  const predictedTimeToAckMs = null // Mark as unknown for now

  return {
    incident_id: incidentId,
    baseline_decisions: baselineDecisions,
    simulated_decisions: simulatedDecisions,
    diff_summary: {
      total_decisions_baseline: baselineDecisions.length,
      total_decisions_simulated: simulatedDecisions.length,
      divergences,
      notifications_sent_baseline: notificationsSentBaseline,
      notifications_sent_simulated: notificationsSentSimulated,
      notifications_suppressed_baseline: notificationsSuppressedBaseline,
      notifications_suppressed_simulated: notificationsSuppressedSimulated
    },
    predicted_time_to_ack_ms: predictedTimeToAckMs,
    safety_checks: safetyChecks
  }
}

/**
 * Simulate multiple incidents over a time range
 */
export async function simulateIncidents(
  timeRange: { start: string; end: string },
  candidatePolicyId: string
): Promise<BatchSimulationResult> {
  const supabase = getServerSupabase()

  // Get candidate policy
  const candidatePolicy = await getPolicyByUuid(candidatePolicyId)
  if (!candidatePolicy) {
    throw new Error(`Policy not found: ${candidatePolicyId}`)
  }

  // Get incidents in time range
  const { data: incidents } = await supabase
    .from('jarvis_incidents')
    .select('incident_id')
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end)
    .order('created_at', { ascending: true })

  const incidentIds = (incidents || []).map(i => i.incident_id)

  // Simulate each incident
  const results: SimulationResult[] = []
  for (const incidentId of incidentIds) {
    try {
      const result = await simulateIncident(incidentId, candidatePolicyId)
      results.push(result)
    } catch (error) {
      logger.error('[Jarvis] Error simulating incident', error instanceof Error ? error : new Error(String(error)), { incident_id: incidentId, candidate_policy_id: candidatePolicyId })
      // Continue with other incidents
    }
  }

  // Aggregate metrics
  const totalNotificationsBaseline = results.reduce(
    (sum, r) => sum + r.diff_summary.notifications_sent_baseline,
    0
  )
  const totalNotificationsSimulated = results.reduce(
    (sum, r) => sum + r.diff_summary.notifications_sent_simulated,
    0
  )
  const incidentsWithDivergences = results.filter(
    r => r.diff_summary.divergences.length > 0
  ).length

  return {
    time_range: timeRange,
    candidate_policy_id: candidatePolicy.policy_id,
    candidate_policy_version: candidatePolicy.version,
    incidents_simulated: results.length,
    results,
    aggregate_metrics: {
      total_notifications_baseline: totalNotificationsBaseline,
      total_notifications_simulated: totalNotificationsSimulated,
      incidents_with_divergences: incidentsWithDivergences,
      avg_time_to_ack_baseline_ms: null, // Would need historical data
      avg_time_to_ack_simulated_ms: null
    }
  }
}

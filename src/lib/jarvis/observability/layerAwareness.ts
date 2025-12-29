/**
 * Jarvis Observability - Layer Awareness
 * 
 * READ-ONLY, NON-AUTHORITATIVE layer classification for incidents.
 * 
 * PHILOSOPHY:
 * - Provides informational context about which operational layers are relevant
 * - Does NOT change Jarvis decision behavior
 * - Does NOT assign severity, owners, or actions
 * - Does NOT recommend rollbacks or changes
 * - Humans remain decision-makers
 * 
 * This is a pure, deterministic function with no side effects.
 */

import type { DecisionTrace } from '../escalation/decideNextAction'
import type { IncidentSnapshot } from '../types'

/**
 * Operational layer identifiers
 * 
 * Only active layers (0-3) are returned. Layers 4-5 are dormant.
 */
export type OperationalLayer = 'LAYER_0' | 'LAYER_1' | 'LAYER_2' | 'LAYER_3'

/**
 * Layer relevance context
 */
export interface LayerRelevance {
  layer: OperationalLayer
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Context for layer classification
 */
export interface LayerContext {
  snapshot?: IncidentSnapshot
  trace?: DecisionTrace
  event_type: 'incident_created' | 'escalation_decision_made'
  recent_deploy?: boolean
  recent_migration?: boolean
  config_changed?: boolean
}

/**
 * Classify which operational layers are relevant to an incident
 * 
 * Pure function: no side effects, no async, no randomness.
 * 
 * @param context - Incident context (snapshot, trace, event type, change indicators)
 * @returns Array of relevant layers (may be empty if insufficient signals)
 */
export function classifyLayerRelevance(context: LayerContext): LayerRelevance[] {
  const layers: LayerRelevance[] = []
  const { snapshot, trace, event_type, recent_deploy, recent_migration, config_changed } = context

  // Only process incident_created and escalation_decision_made events
  if (event_type !== 'incident_created' && event_type !== 'escalation_decision_made') {
    return []
  }

  // Need at least snapshot or trace to classify
  if (!snapshot && !trace) {
    return []
  }

  // Extract signals from snapshot
  const signals = snapshot?.signals
  const systemState = snapshot?.system_state
  const invariantViolations = signals?.invariant_violations || []
  const killSwitchActive = systemState?.kill_switch_active || false
  const guardrailsActive = systemState?.kill_switch_active || false

  // Layer 1 is always relevant (we're in incident response)
  layers.push({
    layer: 'LAYER_1',
    reason: 'Incident response and learning (active incident)',
    confidence: 'high'
  })

  // Layer 0: Execution Safety
  // Relevant if kill switch active, guardrails triggered, or invariant violations
  if (killSwitchActive || guardrailsActive || invariantViolations.length > 0) {
    layers.push({
      layer: 'LAYER_0',
      reason: killSwitchActive 
        ? 'Kill switch active (execution safety mechanism triggered)'
        : invariantViolations.length > 0
        ? `Invariant violations detected (${invariantViolations.length} violation(s))`
        : 'Guardrails active (execution safety)',
      confidence: killSwitchActive ? 'high' : invariantViolations.length > 0 ? 'high' : 'medium'
    })
  }

  // Layer 2: Change Management & Rollbacks
  // Relevant if recent deployment, migration, or config change
  if (recent_deploy || recent_migration || config_changed) {
    const reasons: string[] = []
    if (recent_deploy) reasons.push('recent deployment')
    if (recent_migration) reasons.push('recent migration')
    if (config_changed) reasons.push('config change')

    layers.push({
      layer: 'LAYER_2',
      reason: `Change management relevant (${reasons.join(', ')})`,
      confidence: recent_deploy || recent_migration ? 'high' : 'medium'
    })
  }

  // Layer 2: Also relevant if deploy_recent signal in snapshot
  if (signals?.deploy_recent && !layers.some(l => l.layer === 'LAYER_2')) {
    layers.push({
      layer: 'LAYER_2',
      reason: 'Recent deployment detected (change management relevant)',
      confidence: 'medium'
    })
  }

  // Layer 3: Release Confidence & Proof
  // Relevant if incident suggests proof validation may have been missed
  // Only if there's a recent change (deploy/migration/config) AND the incident is severe
  const severity = trace?.severity || snapshot?.severity_guess
  const hasRecentChange = recent_deploy || recent_migration || config_changed || signals?.deploy_recent
  
  if (hasRecentChange && (severity === 'SEV-1' || severity === 'SEV-2')) {
    layers.push({
      layer: 'LAYER_3',
      reason: 'Release confidence relevant (recent change with incident)',
      confidence: severity === 'SEV-1' ? 'medium' : 'low'
    })
  }

  return layers
}











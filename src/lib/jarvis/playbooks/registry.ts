/**
 * Playbook Registry
 * 
 * Static, versioned playbooks. No LLM-generated plans.
 * All playbooks must be explicitly defined here.
 */

import type { Playbook } from './types'

/**
 * Playbook Registry - The only source of truth for playbooks
 */
export const JARVIS_PLAYBOOKS: Record<string, Playbook> = {
  SCHEDULING_DEGRADED_V1: {
    id: 'SCHEDULING_DEGRADED_V1',
    name: 'Scheduling Degraded Response',
    description: 'Multi-step response for scheduling system degradation',
    version: '1.0.0',
    applicable_environments: ['staging', 'prod'],
    steps: [
      {
        id: 'step_1',
        order: 1,
        action_id: 'DISABLE_SCHEDULING',
        description: 'Disable scheduling to prevent further booking failures',
        risk_level: 'medium',
        required: true
      },
      {
        id: 'step_2',
        order: 2,
        action_id: 'ENABLE_SCHEDULING',
        description: 'Re-enable scheduling after investigation (manual confirmation)',
        risk_level: 'low',
        required: false // Can be skipped if operator decides
      }
    ],
    triggers: ['scheduling_degraded', 'booking_failures', 'error_rate_spike']
  }
}

/**
 * Get playbook by ID
 */
export function getPlaybook(playbookId: string): Playbook | undefined {
  return JARVIS_PLAYBOOKS[playbookId]
}

/**
 * Get all playbooks applicable to environment
 */
export function getApplicablePlaybooks(env: string): Playbook[] {
  return Object.values(JARVIS_PLAYBOOKS).filter(playbook =>
    playbook.applicable_environments.includes(env as 'prod' | 'staging' | 'local')
  )
}

/**
 * Suggest playbook based on incident (deterministic, no LLM)
 */
export function suggestPlaybook(
  incidentType: string,
  env: string
): { playbook_id: string; confidence: 'high' | 'medium' | 'low'; reason: string } | null {
  const applicable = getApplicablePlaybooks(env)
  
  // Find playbook with matching trigger
  for (const playbook of applicable) {
    if (playbook.triggers?.includes(incidentType)) {
      return {
        playbook_id: playbook.id,
        confidence: 'high',
        reason: `Playbook matches incident type: ${incidentType}`
      }
    }
  }

  // Default: suggest scheduling degraded for scheduling issues
  if (incidentType.includes('scheduling') || incidentType.includes('booking')) {
    const schedulingPlaybook = getPlaybook('SCHEDULING_DEGRADED_V1')
    if (schedulingPlaybook && schedulingPlaybook.applicable_environments.includes(env as 'prod' | 'staging' | 'local')) {
      return {
        playbook_id: 'SCHEDULING_DEGRADED_V1',
        confidence: 'medium',
        reason: 'Scheduling-related incident detected'
      }
    }
  }

  return null
}


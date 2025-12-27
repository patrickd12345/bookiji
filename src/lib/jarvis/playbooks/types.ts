/**
 * Playbook Types
 * 
 * Playbooks are static, versioned response plans.
 * LLMs may explain risk but NEVER select actions.
 */

import type { Environment, ActionResult } from '../types'

/**
 * Playbook Step - A single action in a playbook
 */
export interface PlaybookStep {
  id: string // Step identifier (e.g., "step_1", "step_2")
  order: number // Execution order (1, 2, 3, ...)
  action_id: string // Action ID from action registry
  description: string // Human-readable description
  risk_level: 'low' | 'medium' | 'high'
  required: boolean // If false, step can be skipped
}

/**
 * Playbook Definition - Static, versioned playbook
 */
export interface Playbook {
  id: string // Playbook identifier (e.g., "scheduling_degraded_v1")
  name: string // Human-readable name
  description: string // What this playbook addresses
  version: string // Version string (e.g., "1.0.0")
  applicable_environments: Environment[] // Where this playbook can run
  steps: PlaybookStep[] // Ordered steps
  triggers?: string[] // Optional: incident types that suggest this playbook
}

/**
 * Playbook State - Tracks current playbook execution
 */
export interface PlaybookState {
  playbook_id: string
  playbook_version: string
  current_step_index: number // Index into playbook.steps array
  started_at: string
  last_step_at?: string
  completed: boolean
  aborted: boolean
  aborted_at?: string
  steps_executed: Array<{
    step_id: string
    executed_at: string
    result: ActionResult
  }>
  context?: string // Free-text context from operator
}

/**
 * Playbook Selection Result
 */
export interface PlaybookSelection {
  playbook_id: string
  confidence: 'high' | 'medium' | 'low'
  reason: string // Why this playbook was suggested
}


/**
 * Compute Available Commands
 * 
 * Deterministic logic to determine what commands are valid
 * for the current incident state. Never advertises unavailable commands.
 */

import { getAllowedActions } from '../actions/registry'
import { getApplicablePlaybooks } from '../playbooks/registry'
import type { IncidentStatusSnapshot } from './getIncidentSnapshot'
import type { Environment } from '../types'

export interface AvailableCommands {
  read_only: string[]
  actions: Array<{
    id: string
    name: string
    description: string
  }>
  playbooks: Array<{
    id: string
    name: string
    description: string
  }>
}

/**
 * Compute available commands for current incident state
 */
export function computeAvailableCommands(
  incident: IncidentStatusSnapshot | null,
  env: Environment
): AvailableCommands {
  const readOnly: string[] = ['STATUS', 'WHY', 'CHANGES', 'HELP']
  
  const actions: Array<{ id: string; name: string; description: string }> = []
  const playbooks: Array<{ id: string; name: string; description: string }> = []

  // Get allowed actions for environment
  const allowedActions = getAllowedActions(env)
  for (const action of allowedActions) {
    actions.push({
      id: action.id,
      name: action.name,
      description: action.description
    })
  }

  // Get applicable playbooks
  const applicablePlaybooks = getApplicablePlaybooks(env)
  for (const playbook of applicablePlaybooks) {
    playbooks.push({
      id: playbook.id,
      name: playbook.name,
      description: playbook.description
    })
  }

  // If there's an active playbook, add playbook commands
  if (incident?.active_playbook) {
    readOnly.push('NEXT', 'SKIP', 'ABORT')
  }

  return {
    read_only: readOnly,
    actions,
    playbooks
  }
}


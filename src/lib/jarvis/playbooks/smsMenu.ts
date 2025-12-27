/**
 * SMS Menu Rendering for Playbooks
 * 
 * Formats playbook information for SMS display.
 */

import { getPlaybook } from './registry'
import { getActivePlaybookState } from './state'

/**
 * Format playbook selection menu
 */
export function formatPlaybookMenu(
  playbookId: string,
  reason: string
): string {
  const playbook = getPlaybook(playbookId)
  if (!playbook) {
    return `Playbook ${playbookId} not found`
  }

  let message = `📋 Playbook: ${playbook.name}\n\n`
  message += `Reason: ${reason}\n\n`
  message += `Steps (${playbook.steps.length}):\n`
  
  playbook.steps.forEach((step, index) => {
    message += `${index + 1}. ${step.description} (${step.action_id})\n`
  })

  message += `\nReply:\n`
  message += `START ${playbookId} - Begin playbook\n`
  message += `SKIP - Ignore this playbook`

  return message
}

/**
 * Format current playbook step
 */
export async function formatCurrentStep(
  ownerPhone: string
): Promise<string | null> {
  const state = await getActivePlaybookState(ownerPhone)
  if (!state) {
    return null
  }

  const playbook = getPlaybook(state.playbook_id)
  if (!playbook) {
    return null
  }

  const currentStep = playbook.steps[state.current_step_index]
  if (!currentStep) {
    return `✅ Playbook "${playbook.name}" completed.\n\nAll steps executed.`
  }

  let message = `📋 Playbook: ${playbook.name}\n\n`
  message += `Step ${state.current_step_index + 1}/${playbook.steps.length}\n`
  message += `${currentStep.description}\n`
  message += `Action: ${currentStep.action_id}\n`
  message += `Risk: ${currentStep.risk_level.toUpperCase()}\n\n`
  
  if (state.steps_executed.length > 0) {
    message += `Completed:\n`
    state.steps_executed.forEach((executed, index) => {
      message += `${index + 1}. ${executed.result.success ? '✅' : '❌'} ${executed.step_id}\n`
    })
    message += `\n`
  }

  message += `Reply:\n`
  message += `NEXT - Execute this step\n`
  message += `SKIP - Skip this step (if optional)\n`
  message += `ABORT - Cancel playbook`

  return message
}

/**
 * Format playbook completion message
 */
export function formatPlaybookComplete(
  playbookId: string,
  stepsExecuted: number
): string {
  const playbook = getPlaybook(playbookId)
  if (!playbook) {
    return `Playbook ${playbookId} completed`
  }

  return `✅ Playbook "${playbook.name}" completed.\n\n${stepsExecuted} steps executed successfully.`
}

/**
 * Format playbook abort message
 */
export function formatPlaybookAbort(
  playbookId: string
): string {
  const playbook = getPlaybook(playbookId)
  if (!playbook) {
    return `Playbook ${playbookId} aborted`
  }

  return `⛔ Playbook "${playbook.name}" aborted.\n\nNo further steps will execute.`
}


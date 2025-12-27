/**
 * Playbook Engine
 * 
 * Handles:
 * - Playbook selection
 * - Step tracking
 * - One-step execution enforcement
 * - State management
 */

import { getPlaybook } from './registry'
import { getActivePlaybookState, savePlaybookState, updatePlaybookState } from './state'
import { executeWithGuards } from '../execution/executeWithGuards'
import { logJarvisAction } from '../audit/auditLog'
import type { PlaybookState } from './types'
import type { Environment, ParsedIntent } from '../types'

export interface PlaybookExecutionResult {
  success: boolean
  message: string
  next_step?: {
    step_id: string
    description: string
    action_id: string
  }
  completed: boolean
  aborted: boolean
}

/**
 * Start a playbook
 */
export async function startPlaybook(
  playbookId: string,
  ownerPhone: string,
  env: Environment,
  context?: string
): Promise<PlaybookExecutionResult> {
  const playbook = getPlaybook(playbookId)
  if (!playbook) {
    return {
      success: false,
      message: `Playbook ${playbookId} not found`,
      completed: false,
      aborted: false
    }
  }

  // Check if playbook is applicable to environment
  if (!playbook.applicable_environments.includes(env)) {
    return {
      success: false,
      message: `Playbook ${playbookId} not applicable to ${env}`,
      completed: false,
      aborted: false
    }
  }

  // Create initial state
  const state: PlaybookState = {
    playbook_id: playbookId,
    playbook_version: playbook.version,
    current_step_index: 0,
    started_at: new Date().toISOString(),
    completed: false,
    aborted: false,
    steps_executed: [],
    context
  }

  // Save state
  await savePlaybookState(ownerPhone, state)

  // Get first step
  const firstStep = playbook.steps[0]
  if (!firstStep) {
    return {
      success: false,
      message: 'Playbook has no steps',
      completed: false,
      aborted: false
    }
  }

  return {
    success: true,
    message: `Playbook "${playbook.name}" started. Ready for step 1.`,
    next_step: {
      step_id: firstStep.id,
      description: firstStep.description,
      action_id: firstStep.action_id
    },
    completed: false,
    aborted: false
  }
}

/**
 * Execute next step in active playbook
 */
export async function executeNextStep(
  ownerPhone: string,
  env: Environment,
  confirm: boolean = true
): Promise<PlaybookExecutionResult> {
  // Get active playbook state
  const state = await getActivePlaybookState(ownerPhone)
  if (!state) {
    return {
      success: false,
      message: 'No active playbook found',
      completed: false,
      aborted: false
    }
  }

  if (state.completed) {
    return {
      success: false,
      message: 'Playbook already completed',
      completed: true,
      aborted: false
    }
  }

  if (state.aborted) {
    return {
      success: false,
      message: 'Playbook was aborted',
      completed: false,
      aborted: true
    }
  }

  // Get playbook
  const playbook = getPlaybook(state.playbook_id)
  if (!playbook) {
    return {
      success: false,
      message: `Playbook ${state.playbook_id} not found`,
      completed: false,
      aborted: false
    }
  }

  // Get current step
  const currentStep = playbook.steps[state.current_step_index]
  if (!currentStep) {
    // No more steps - mark as completed
    const completedState: PlaybookState = {
      ...state,
      completed: true,
      last_step_at: new Date().toISOString()
    }
    await updatePlaybookState(completedState)

    return {
      success: true,
      message: 'Playbook completed - all steps executed',
      completed: true,
      aborted: false
    }
  }

  // If not confirmed, just return next step info
  if (!confirm) {
    return {
      success: true,
      message: `Next step: ${currentStep.description}`,
      next_step: {
        step_id: currentStep.id,
        description: currentStep.description,
        action_id: currentStep.action_id
      },
      completed: false,
      aborted: false
    }
  }

  // Execute current step
  const result = await executeWithGuards(
    currentStep.action_id,
    env,
    ownerPhone,
    ownerPhone,
    state.context,
    undefined // No snapshot needed for playbook steps
  )

  // Log execution
  await logJarvisAction({
    timestamp: new Date().toISOString(),
    sender_phone: ownerPhone,
    parsed_intent: {
      actions: [currentStep.action_id],
      confidence: 'high'
    } as ParsedIntent,
    action_id: currentStep.action_id,
    action_result: result,
    environment: env,
    context: `Playbook step: ${currentStep.id}`
  })

  // Update state
  const updatedState: PlaybookState = {
    ...state,
    current_step_index: state.current_step_index + 1,
    last_step_at: new Date().toISOString(),
    steps_executed: [
      ...state.steps_executed,
      {
        step_id: currentStep.id,
        executed_at: new Date().toISOString(),
        result
      }
    ]
  }

  // Check if completed
  const nextStep = playbook.steps[updatedState.current_step_index]
  if (!nextStep) {
    updatedState.completed = true
  }

  await updatePlaybookState(updatedState)

  // Get next step info
  const nextStepInfo = nextStep ? {
    step_id: nextStep.id,
    description: nextStep.description,
    action_id: nextStep.action_id
  } : undefined

  return {
    success: result.success,
    message: result.success
      ? `Step executed: ${currentStep.description}\n${nextStep ? `Next: ${nextStep.description}` : 'Playbook complete'}`
      : `Step failed: ${result.message}`,
    next_step: nextStepInfo,
    completed: !nextStep,
    aborted: false
  }
}

/**
 * Abort active playbook
 */
export async function abortPlaybook(
  ownerPhone: string
): Promise<PlaybookExecutionResult> {
  const state = await getActivePlaybookState(ownerPhone)
  if (!state) {
    return {
      success: false,
      message: 'No active playbook to abort',
      completed: false,
      aborted: false
    }
  }

  const abortedState: PlaybookState = {
    ...state,
    aborted: true,
    aborted_at: new Date().toISOString()
  }

  await updatePlaybookState(abortedState)

  return {
    success: true,
    message: 'Playbook aborted',
    completed: false,
    aborted: true
  }
}


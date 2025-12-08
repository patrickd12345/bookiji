import { runSyntheticCheck } from '../../../../../../packages/opsai-l7/src/synthetic'
import {
  flushCache,
  resetDeploymentPointers,
  restartComponent
} from '../../../../../../packages/opsai-l7/src/actions'
import { recommendActions } from '../../../../../../packages/opsai-helpdesk/src/engine'
import { createEvent } from '@/scripts/ops-events-store'
import type { CommandRequest, CommandResponse } from './types'

type CommandHandler = (args: Record<string, any>) => Promise<CommandResponse>

function normalize(command: string) {
  return command.trim().toLowerCase()
}

const handlers: Record<string, CommandHandler> = {
  'restart api': async () => {
    const result = restartComponent('api')
    return {
      accepted: true,
      message: result.detail,
      executedAt: result.timestamp,
      result
    }
  },
  'restart worker': async () => {
    const result = restartComponent('worker')
    return {
      accepted: true,
      message: result.detail,
      executedAt: result.timestamp,
      result
    }
  },
  'flush cache': async () => {
    const result = flushCache()
    return {
      accepted: true,
      message: result.detail,
      executedAt: result.timestamp,
      result
    }
  },
  'trigger synthetic-check': async () => {
    const report = runSyntheticCheck()
    return {
      accepted: true,
      message: 'Synthetic reliability check executed',
      executedAt: new Date().toISOString(),
      result: report
    }
  },
  'recalc risk': async () => {
    const report = runSyntheticCheck()
    const actions = recommendActions({
      metrics: {
        bookings: {
          baseline: report.summary.bookings + 10,
          current: report.summary.bookings
        },
        health: { trend: report.predictions.health.trend }
      },
      summary: {
        health: { overall: report.summary.healthScore > 0.75 ? 'green' : 'yellow' }
      }
    })
    return {
      accepted: true,
      message: `Risk recalculated. ${actions[0] || 'No new actions recommended.'}`,
      executedAt: new Date().toISOString(),
      result: { actions, predictions: report.predictions }
    }
  }
}

async function handleFallback(command: string): Promise<CommandResponse> {
  const executedAt = new Date().toISOString()
  return {
    accepted: true,
    message: `Command '${command}' acknowledged (simulated)`,
    executedAt,
    result: { simulated: true }
  }
}

export async function runControlCommand(
  payload: CommandRequest
): Promise<CommandResponse> {
  const commandKey = normalize(payload.command)
  const handler =
    handlers[commandKey] ||
    handlers[commandKey.replace(' run ', ' ')] ||
    handlers[commandKey.replace('execute ', '')]

  const response = handler ? await handler(payload.args || {}) : await handleFallback(commandKey)

  try {
    createEvent({
      type: 'user-action',
      severity: response.accepted ? 'info' : 'warning',
      title: `Control command: ${payload.command}`,
      description: response.message,
      source: 'controlplane',
      data: { args: payload.args, result: response.result },
      relatedActionIds: [],
      relatedIncidentIds: []
    })
  } catch {
    // non-blocking
  }

  return response
}

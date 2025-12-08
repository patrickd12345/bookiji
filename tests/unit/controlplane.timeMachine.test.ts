import { describe, it, expect } from 'vitest'
import { getTimeMachineState, getTimeMachineDiff } from '../../src/app/api/ops/controlplane/_lib/time-machine'

const baseState = {
  summary: async () => ({ health: { overall: 'green' } }),
  metrics: async () => ({ raw_metrics: [1, 2, 3], analysis: { trend: 'steady' } }),
  deployments: async () => [
    { id: 'd1', status: 'completed', startedAt: '2024-01-01T00:00:00Z', completedAt: '2024-01-01T01:00:00Z' }
  ],
  incidents: async () => []
}

describe('time machine', () => {
  it('returns snapshot at timestamp', async () => {
    const state = await getTimeMachineState('2024-01-01T02:00:00Z', undefined, baseState)
    expect(state.health.overall).toBe('green')
    expect(state.deployments.length).toBe(1)
  })

  it('computes diffs between snapshots', async () => {
    const diff = await getTimeMachineDiff(
      '2024-01-01T00:00:00Z',
      '2024-01-02T00:00:00Z',
      undefined,
      baseState
    )
    expect(diff.changes.healthChanged).toBe(false)
    expect(typeof diff.changes.deploymentsDelta).toBe('number')
  })
})

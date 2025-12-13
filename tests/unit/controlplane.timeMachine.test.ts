import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getTimeMachineState, getTimeMachineDiff } from '../../src/app/api/ops/controlplane/_lib/time-machine'
import { getSupabaseMock } from '../utils/supabase-mocks'

const baseState = {
  summary: async () => ({ health: { overall: 'green' } }),
  metrics: async () => ({ raw_metrics: [1, 2, 3], analysis: { trend: 'steady' } }),
  deployments: async () => [
    { id: 'd1', status: 'completed', startedAt: '2024-01-01T00:00:00Z', completedAt: '2024-01-02T00:00:00Z' }
  ],
  incidents: async () => []
}

describe('time machine', () => {
  beforeEach(() => {
    const supabase = getSupabaseMock()
    const original = supabase.from.getMockImplementation?.() ?? (() => ({} as any))
    supabase.from.mockImplementation((table: string) => {
      if (table === 'deployments') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: [{ id: 'mock-deploy-1', status: 'healthy' }],
              error: null
            }))
          }))
        } as any
      }
      return original(table)
    })
  })

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

import { describe, it, expect } from 'vitest'
import { evaluatePlaybooks } from '../../src/app/api/ops/controlplane/_lib/playbooks'

describe('playbook evaluation', () => {
  it('marks health playbook hot when degraded', () => {
    const result = evaluatePlaybooks({ health: 'yellow', metrics: {}, incidents: [] })
    const healthPb = result.find((p) => p.id === 'health-degraded')
    expect(healthPb?.hot).toBe(true)
  })

  it('marks incident playbook when severe incidents exist', () => {
    const result = evaluatePlaybooks({
      health: 'green',
      metrics: {},
      incidents: [{ id: '1', severity: 'critical', createdAt: '', updatedAt: '', title: '', description: '', status: 'open', source: 'watchdog', signals: [], metadata: {} } as any]
    })
    expect(result.find((p) => p.id === 'incident-severe')?.hot).toBe(true)
  })
})

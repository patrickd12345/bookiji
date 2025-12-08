import { describe, it, expect } from 'vitest'
import { formatSummary } from '../../apps/opsai-control-plane/src/services/personaFormatter'

describe('personaFormatter', () => {
  const base = {
    health: { overall: 'green' },
    predictions: {
      healthTrend: { trend: 'up', confidence: 0.8 },
      bookingsTrend: { trend: 'steady', confidence: 0.5 }
    },
    incidents: []
  }

  it('returns engineer details', () => {
    const result = formatSummary('engineer', base, base.predictions, base.incidents)
    expect(result.title).toContain('Health')
    expect(result.bullets?.length).toBeGreaterThan(0)
  })

  it('returns manager summary', () => {
    const result = formatSummary('manager', base, base.predictions, base.incidents)
    expect(result.title).toBe('Ops pulse')
    expect(result.body).toContain('health')
  })

  it('handles incidents for detective', () => {
    const result = formatSummary(
      'detective',
      base,
      base.predictions,
      [{ title: 'Latency spike', severity: 'high' } as any]
    )
    expect(result.body.toLowerCase()).toContain('anomaly')
  })
})

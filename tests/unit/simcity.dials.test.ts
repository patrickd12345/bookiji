import { describe, it, expect } from 'vitest'
import { DEFAULT_DIALS, validateDial } from '@/app/api/ops/controlplane/_lib/simcity-dials'
import { METRICS_REGISTRY } from '@/app/api/ops/controlplane/_lib/simcity-metrics'
import { evalDials } from '@/app/api/ops/controlplane/_lib/simcity-evaluator'
import type { DialDefinition } from '@/app/api/ops/controlplane/_lib/simcity-types'

describe('SimCity dials (unit)', () => {
  it('all dials reference metrics in registry', () => {
    for (const dial of DEFAULT_DIALS) {
      expect(METRICS_REGISTRY[dial.metric]).toBeDefined()
    }
  })

  it('dial validation: ranges non-overlap for higher-is-better', () => {
    const dial: DialDefinition = {
      metric: 'booking.success_rate',
      green: [0.95, 1.0],
      yellow: [0.90, 0.95],
      red: [0.0, 0.90],
    }

    const result = validateDial(dial)
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
  })

  it('dial validation: ranges non-overlap for lower-is-better', () => {
    const dial: DialDefinition = {
      metric: 'error.rate',
      green: [0.0, 0.01],
      yellow: [0.01, 0.03],
      red: [0.03, 1.0],
    }

    const result = validateDial(dial)
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
  })

  it('dial validation: detects overlapping ranges', () => {
    const dial: DialDefinition = {
      metric: 'booking.success_rate',
      green: [0.90, 1.0],
      yellow: [0.95, 0.98], // Overlaps with green
      red: [0.0, 0.90],
    }

    const result = validateDial(dial)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('zone classification correctness at boundaries', () => {
    const dial: DialDefinition = {
      metric: 'booking.success_rate',
      green: [0.95, 1.0],
      yellow: [0.90, 0.95],
      red: [0.0, 0.90],
    }

    const metrics = {
      'booking.success_rate': 0.95,
      'booking.drop_rate': 0,
      'capacity.utilization': 0,
      'trust.violation_rate': 0,
      'latency.p95': 0,
      'error.rate': 0,
    }

    const statuses = evalDials(metrics, [dial])
    const status = statuses.find((s) => s.metric === 'booking.success_rate')

    // 0.95 is at the boundary between green and yellow
    // Should be classified as green (inclusive range)
    expect(status?.zone).toBe('green')
  })

  it('zone classification for lower-is-better metrics', () => {
    const dial: DialDefinition = {
      metric: 'error.rate',
      green: [0.0, 0.01],
      yellow: [0.01, 0.03],
      red: [0.03, 1.0],
    }

    const metrics = {
      'booking.success_rate': 0,
      'booking.drop_rate': 0,
      'capacity.utilization': 0,
      'trust.violation_rate': 0,
      'latency.p95': 0,
      'error.rate': 0.005, // In green range
    }

    const statuses = evalDials(metrics, [dial])
    const status = statuses.find((s) => s.metric === 'error.rate')

    expect(status?.zone).toBe('green')
  })

  it('all default dials are valid', () => {
    for (const dial of DEFAULT_DIALS) {
      const result = validateDial(dial)
      expect(result.valid).toBe(true)
      if (!result.valid) {
        console.error(`Dial ${dial.metric} validation errors:`, result.errors)
      }
    }
  })
})








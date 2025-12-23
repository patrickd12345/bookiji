import { describe, it, expect } from 'vitest'
import { computeMetricDeltas, evaluateReplayVariant, evalDials } from '@/app/api/ops/controlplane/_lib/simcity-evaluator'
import { DEFAULT_DIALS } from '@/app/api/ops/controlplane/_lib/simcity-dials'
import type { MetricId, SimCityEventEnvelope } from '@/app/api/ops/controlplane/_lib/simcity-types'

describe('SimCity evaluator (unit)', () => {
  function createMockEvent(
    id: string,
    tick: number,
    domain: string,
    type: string,
    payload: Record<string, unknown> = {}
  ): SimCityEventEnvelope {
    return {
      version: 1,
      seed: 42,
      generatedAtTick: tick,
      event: {
        id,
        tick,
        domain,
        type,
        payload,
      },
    }
  }

  it('deltas direction respects metric direction (higher-is-better)', () => {
    const baseMetrics: Record<MetricId, number> = {
      'booking.success_rate': 0.90,
      'booking.drop_rate': 0.05,
      'capacity.utilization': 0.5,
      'trust.violation_rate': 0.01,
      'latency.p95': 200,
      'error.rate': 0.02,
    }

    const variantMetrics: Record<MetricId, number> = {
      ...baseMetrics,
      'booking.success_rate': 0.95, // Improved (higher is better)
      'error.rate': 0.01, // Improved (lower is better)
    }

    const deltas = computeMetricDeltas(baseMetrics, variantMetrics)

    const successDelta = deltas.find((d) => d.id === 'booking.success_rate')
    expect(successDelta?.direction).toBe('improved')

    const errorDelta = deltas.find((d) => d.id === 'error.rate')
    expect(errorDelta?.direction).toBe('improved')
  })

  it('deltas direction respects metric direction (lower-is-better)', () => {
    const baseMetrics: Record<MetricId, number> = {
      'booking.success_rate': 0.90,
      'booking.drop_rate': 0.05,
      'capacity.utilization': 0.5,
      'trust.violation_rate': 0.01,
      'latency.p95': 200,
      'error.rate': 0.02,
    }

    const variantMetrics: Record<MetricId, number> = {
      ...baseMetrics,
      'error.rate': 0.03, // Degraded (lower is better, but value increased)
    }

    const deltas = computeMetricDeltas(baseMetrics, variantMetrics)

    const errorDelta = deltas.find((d) => d.id === 'error.rate')
    expect(errorDelta?.direction).toBe('degraded')
  })

  it('evaluation.allowed false when any red', () => {
    const baseEvents: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 1, 'engine', 'tick', {}),
    ]

    // Create variant with high error rate (should trigger red dial)
    const variantEvents: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 1, 'engine', 'tick', {}),
      createMockEvent('evt2', 2, 'engine', 'error', { message: 'test' }),
      createMockEvent('evt3', 3, 'engine', 'error', { message: 'test' }),
      createMockEvent('evt4', 4, 'engine', 'error', { message: 'test' }),
      createMockEvent('evt5', 5, 'engine', 'error', { message: 'test' }),
    ]

    const evaluation = evaluateReplayVariant({
      reportHash: 'test-hash',
      baseEvents,
      variantEvents,
      dials: DEFAULT_DIALS,
      variantId: 'test-variant',
    })

    // High error rate should trigger red dial, making allowed = false
    expect(evaluation.allowed).toBe(false)
    expect(evaluation.violated.length).toBeGreaterThan(0)
  })

  it('summary is deterministic', () => {
    const baseEvents: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 1, 'engine', 'tick', {}),
    ]

    const variantEvents: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 1, 'engine', 'tick', {}),
      createMockEvent('evt2', 2, 'engine', 'error', { message: 'test' }),
    ]

    const evaluation1 = evaluateReplayVariant({
      reportHash: 'test-hash',
      baseEvents,
      variantEvents,
      dials: DEFAULT_DIALS,
      variantId: 'test-variant',
    })

    const evaluation2 = evaluateReplayVariant({
      reportHash: 'test-hash',
      baseEvents,
      variantEvents,
      dials: DEFAULT_DIALS,
      variantId: 'test-variant',
    })

    // Same inputs should produce same summary
    expect(evaluation1.summary).toBe(evaluation2.summary)
  })

  it('neutral deltas for very small changes', () => {
    const baseMetrics: Record<MetricId, number> = {
      'booking.success_rate': 0.90,
      'booking.drop_rate': 0.05,
      'capacity.utilization': 0.5,
      'trust.violation_rate': 0.01,
      'latency.p95': 200,
      'error.rate': 0.02,
    }

    const variantMetrics: Record<MetricId, number> = {
      ...baseMetrics,
      'booking.success_rate': 0.90 + 1e-10, // Tiny change
    }

    const deltas = computeMetricDeltas(baseMetrics, variantMetrics)

    const successDelta = deltas.find((d) => d.id === 'booking.success_rate')
    expect(successDelta?.direction).toBe('neutral')
  })

  it('evalDials classifies zones correctly', () => {
    const metrics: Record<MetricId, number> = {
      'booking.success_rate': 0.98, // In green range
      'booking.drop_rate': 0.03, // In yellow range
      'capacity.utilization': 0.9, // In red range
      'trust.violation_rate': 0.0,
      'latency.p95': 100,
      'error.rate': 0.005,
    }

    const statuses = evalDials(metrics, DEFAULT_DIALS)

    const successStatus = statuses.find((s) => s.metric === 'booking.success_rate')
    expect(successStatus?.zone).toBe('green')

    const dropStatus = statuses.find((s) => s.metric === 'booking.drop_rate')
    expect(dropStatus?.zone).toBe('yellow')

    const utilStatus = statuses.find((s) => s.metric === 'capacity.utilization')
    expect(utilStatus?.zone).toBe('red')
  })
})


















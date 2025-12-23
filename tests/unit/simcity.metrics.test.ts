import { describe, it, expect } from 'vitest'
import { computeMetricsFromEvents } from '@/app/api/ops/controlplane/_lib/simcity-metric-extractors'
import type { SimCityEventEnvelope } from '@/app/api/ops/controlplane/_lib/simcity-types'

describe('SimCity metrics (unit)', () => {
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

  it('computeMetricsFromEvents is deterministic for same input', () => {
    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 1, 'booking-load', 'load_spike', { severity: 3 }),
      createMockEvent('evt2', 2, 'booking-load', 'latency_jitter', { ms: 150 }),
      createMockEvent('evt3', 3, 'engine', 'fault_injected', { domain: 'db', faultId: 'f1' }),
    ]

    const metrics1 = computeMetricsFromEvents(events)
    const metrics2 = computeMetricsFromEvents(events)

    expect(metrics1).toStrictEqual(metrics2)
  })

  it('p95 is deterministic', () => {
    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 1, 'booking-load', 'latency_jitter', { ms: 100 }),
      createMockEvent('evt2', 2, 'booking-load', 'latency_jitter', { ms: 200 }),
      createMockEvent('evt3', 3, 'booking-load', 'latency_jitter', { ms: 300 }),
      createMockEvent('evt4', 4, 'booking-load', 'latency_jitter', { ms: 400 }),
      createMockEvent('evt5', 5, 'booking-load', 'latency_jitter', { ms: 500 }),
    ]

    const metrics = computeMetricsFromEvents(events)

    // p95 of [100, 200, 300, 400, 500] should be 500 (index 4)
    expect(metrics['latency.p95']).toBe(500)
  })

  it('missing signals returns documented defaults', () => {
    const emptyEvents: SimCityEventEnvelope[] = []

    const metrics = computeMetricsFromEvents(emptyEvents)

    // All metrics should be present with default values
    expect(metrics['booking.success_rate']).toBe(0)
    expect(metrics['booking.drop_rate']).toBe(0)
    expect(metrics['capacity.utilization']).toBe(0)
    expect(metrics['trust.violation_rate']).toBe(0)
    expect(metrics['latency.p95']).toBe(0)
    expect(metrics['error.rate']).toBe(0)
  })

  it('extracts error rate from error events', () => {
    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 1, 'engine', 'tick', {}),
      createMockEvent('evt2', 2, 'engine', 'error', { message: 'test' }),
      createMockEvent('evt3', 3, 'engine', 'fault_injected', { domain: 'db' }),
    ]

    const metrics = computeMetricsFromEvents(events)

    // 2 errors out of 3 events = 0.667
    expect(metrics['error.rate']).toBeCloseTo(2 / 3, 3)
  })

  it('extracts capacity utilization from booking-load events', () => {
    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 1, 'booking-load', 'load_spike', { utilization: 0.75 }),
    ]

    const metrics = computeMetricsFromEvents(events)

    expect(metrics['capacity.utilization']).toBe(0.75)
  })

  it('handles missing latency events gracefully', () => {
    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 1, 'engine', 'tick', {}),
    ]

    const metrics = computeMetricsFromEvents(events)

    expect(metrics['latency.p95']).toBe(0)
  })
})


















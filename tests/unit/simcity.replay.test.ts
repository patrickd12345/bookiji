import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  simCityStart,
  simCityStop,
  simCityTick,
  simCityStatus,
  simCityCursor,
} from '@/app/api/ops/controlplane/_lib/simcity'
import { runReplayVariant } from '@/app/api/ops/controlplane/_lib/simcity-replay'
import { generateReplayReport } from '@/app/api/ops/controlplane/_lib/simcity-replay-reports'
import type { SimCityReplayVariant } from '@/app/api/ops/controlplane/_lib/simcity-types'

describe('SimCity replay (integration)', () => {
  beforeEach(() => {
    process.env.DEPLOY_ENV = 'test'
    process.env.SIMCITY_ALLOWED_ENVS = 'test,staging,recovery'
    try {
      simCityStop()
    } catch {
      // ignore if not allowed/running
    }
  })

  afterEach(() => {
    try {
      simCityStop()
    } catch {
      // ignore
    }
  })

  it('replay is deterministic: same request yields same reportHash', async () => {
    const cfg = {
      seed: 42,
      tickRateMs: 0,
      enabledDomains: ['booking-load'],
      domains: {
        'booking-load': {
          spikeProbability: 0.5,
          maxSeverity: 3,
        },
      },
    }

    simCityStart(cfg)
    // Run some ticks to build event history
    for (let i = 0; i < 5; i++) {
      await simCityTick()
    }

    const status = simCityStatus()
    const cursor = simCityCursor()
    const baseEvents = status.events.filter((e) => e.generatedAtTick < 3)

    // Run replay twice
    const replay1 = runReplayVariant(
      cursor.seed ?? 0,
      cfg,
      baseEvents,
      3,
      7,
      []
    )

    const replay2 = runReplayVariant(
      cursor.seed ?? 0,
      cfg,
      baseEvents,
      3,
      7,
      []
    )

    // Generate reports
    const report1 = generateReplayReport(
      'test-run-1',
      cursor.seed ?? 0,
      3,
      7,
      replay1,
      []
    )

    const report2 = generateReplayReport(
      'test-run-2',
      cursor.seed ?? 0,
      3,
      7,
      replay2,
      []
    )

    // Same inputs should produce same reportHash (ignoring runId and generatedAt)
    expect(replay1.events).toStrictEqual(replay2.events)
    expect(report1.reportHash).toBe(report2.reportHash)
  })

  it('replay is isolated: does not change live engine state', async () => {
    const cfg = {
      seed: 123,
      tickRateMs: 0,
      enabledDomains: ['booking-load'],
    }

    simCityStart(cfg)
    for (let i = 0; i < 3; i++) {
      await simCityTick()
    }

    const statusBefore = simCityStatus()
    const cursor = simCityCursor()
    const baseEvents = statusBefore.events.filter((e) => e.generatedAtTick < 2)
    const tickBefore = statusBefore.tick
    const eventCountBefore = statusBefore.events.length

    // Run replay
    runReplayVariant(
      cursor.seed ?? 0,
      cfg,
      baseEvents,
      2,
      5,
      []
    )

    // Check live engine is unchanged
    const statusAfter = simCityStatus()
    expect(statusAfter.tick).toBe(tickBefore)
    expect(statusAfter.events.length).toBe(eventCountBefore)
  })

  it('intervention effect: applying proposal changes metrics or event count', async () => {
    const cfg = {
      seed: 456,
      tickRateMs: 0,
      enabledDomains: ['booking-load'],
      domains: {
        'booking-load': {
          spikeProbability: 0.8, // High probability to ensure events
          maxSeverity: 5,
        },
      },
    }

    simCityStart(cfg)
    for (let i = 0; i < 3; i++) {
      await simCityTick()
    }

    const status = simCityStatus()
    const cursor = simCityCursor()
    const baseEvents = status.events.filter((e) => e.generatedAtTick < 2)

    // Baseline replay
    const baseline = runReplayVariant(
      cursor.seed ?? 0,
      cfg,
      baseEvents,
      2,
      5,
      []
    )

    // Variant with intervention
    const intervention = {
      atTick: 3,
      proposals: [
        {
          id: 'test-proposal-1',
          tick: 3,
          domain: 'booking-load',
          action: 'throttle_booking_acceptance',
          description: 'Test intervention',
          confidence: 0.8,
          evidenceEventIds: [],
          source: 'rules' as const,
        },
      ],
    }

    const variant = runReplayVariant(
      cursor.seed ?? 0,
      cfg,
      baseEvents,
      2,
      5,
      [intervention]
    )

    // Generate report
    const report = generateReplayReport(
      'test-intervention',
      cursor.seed ?? 0,
      2,
      5,
      baseline,
      [{ name: 'with-intervention', ...variant }]
    )

    // Should have differences
    expect(report.diffs.length).toBeGreaterThan(0)

    // Check that intervention event was emitted
    const interventionEvents = variant.events.filter(
      (e) => e.event.type === 'intervention.applied'
    )
    expect(interventionEvents.length).toBeGreaterThan(0)

    // Either event counts or metrics should differ
    const hasEventDiff = report.diffs.some((diff) => diff.eventDiffs.length > 0)
    const hasMetricDiff = report.diffs.some((diff) => diff.metricDeltas.length > 0)

    expect(hasEventDiff || hasMetricDiff).toBe(true)
  })

  it('replay handles empty interventions correctly', async () => {
    const cfg = {
      seed: 789,
      tickRateMs: 0,
      enabledDomains: ['booking-load'],
    }

    simCityStart(cfg)
    for (let i = 0; i < 3; i++) {
      await simCityTick()
    }

    const status = simCityStatus()
    const cursor = simCityCursor()
    const baseEvents = status.events.filter((e) => e.generatedAtTick < 2)

    const replay = runReplayVariant(
      cursor.seed ?? 0,
      cfg,
      baseEvents,
      2,
      4,
      [] // Empty interventions
    )

    expect(replay.events.length).toBeGreaterThan(0)
    expect(replay.summary.totalEvents).toBe(replay.events.length)
  })

  it('replay respects tick boundaries', async () => {
    const cfg = {
      seed: 999,
      tickRateMs: 0,
      enabledDomains: ['booking-load'],
    }

    simCityStart(cfg)
    for (let i = 0; i < 5; i++) {
      await simCityTick()
    }

    const status = simCityStatus()
    const cursor = simCityCursor()
    const baseEvents = status.events.filter((e) => e.generatedAtTick < 2)

    const replay = runReplayVariant(
      cursor.seed ?? 0,
      cfg,
      baseEvents,
      2,
      4,
      []
    )

    // All events should be in the tick range [2, 4]
    for (const envelope of replay.events) {
      expect(envelope.generatedAtTick).toBeGreaterThanOrEqual(2)
      expect(envelope.generatedAtTick).toBeLessThanOrEqual(4)
    }
  })
})




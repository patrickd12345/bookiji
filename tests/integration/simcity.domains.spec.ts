import { describe, it, expect, beforeEach } from 'vitest'
import { simCityStart, simCityStop, simCityTick, simCityStatus } from '@/app/api/ops/controlplane/_lib/simcity'

describe('SimCity domains (integration)', () => {
  beforeEach(() => {
    process.env.DEPLOY_ENV = 'test'
    process.env.SIMCITY_ALLOWED_ENVS = 'test,staging,recovery'
    try {
      simCityStop()
    } catch {
      // ignore if not allowed/running
    }
  })

  it('emits deterministic domain event streams for the same seed/config', () => {
    const cfg = {
      seed: 42,
      tickRateMs: 0,
      latency: { p50Ms: 20, p95Ms: 200 },
      enabledDomains: ['booking-load'],
      domains: {
        'booking-load': {
          spikeProbability: 1,
          maxSeverity: 3,
          latencyJitterProbability: 1,
          softFailureProbability: 1,
        },
      },
    }

    simCityStart(cfg)
    const eventsA = []
    for (let i = 0; i < 5; i += 1) eventsA.push(...simCityTick())
    const statusA = simCityStatus()
    simCityStop()

    simCityStart(cfg)
    const eventsB = []
    for (let i = 0; i < 5; i += 1) eventsB.push(...simCityTick())
    const statusB = simCityStatus()
    simCityStop()

    expect(eventsA).toStrictEqual(eventsB)
    expect(statusA.activeDomains).toStrictEqual(['booking-load'])
    expect(statusB.activeDomains).toStrictEqual(['booking-load'])
    expect(statusA.eventsByDomain.engine?.length).toBeGreaterThan(0)
    expect(statusA.eventsByDomain.booking?.length).toBeGreaterThan(0)
    expect(statusA.eventsByDomain.payment?.length).toBeGreaterThan(0)
  })
})


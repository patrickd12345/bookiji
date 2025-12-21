import { describe, it, expect, beforeEach } from 'vitest'
import { simCityStart, simCityStop, simCityTick, simCityGetEvents } from '@/app/api/ops/controlplane/_lib/simcity'

describe('SimCity events (integration)', () => {
  beforeEach(() => {
    process.env.DEPLOY_ENV = 'test'
    process.env.SIMCITY_ALLOWED_ENVS = 'test,staging,recovery'
    try {
      simCityStop()
    } catch {
      // ignore if not allowed/running
    }
  })

  it('exposes deterministic event streams and supports sinceTick + domain filters', async () => {
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
    for (let i = 0; i < 5; i += 1) await simCityTick()
    const allA = simCityGetEvents({ limit: 1000 }).map((e) => e.event)
    const since3A = simCityGetEvents({ sinceTick: 3, limit: 1000 }).map((e) => e.event)
    const bookingA = simCityGetEvents({ domain: 'booking-load', limit: 1000 }).map((e) => e.event)
    simCityStop()

    simCityStart(cfg)
    for (let i = 0; i < 5; i += 1) await simCityTick()
    const allB = simCityGetEvents({ limit: 1000 }).map((e) => e.event)
    simCityStop()

    expect(allA).toStrictEqual(allB)
    expect(allA.every((event) => typeof event.id === 'string' && event.id.length > 0)).toBe(true)
    expect(allA.every((event) => event.tick >= 1)).toBe(true)
    expect(allA.every((event) => typeof event.domain === 'string' && typeof event.type === 'string')).toBe(true)
    expect(allA.every((event) => typeof event.payload === 'object' && event.payload !== null)).toBe(true)

    expect(since3A.every((event) => event.tick > 3)).toBe(true)
    expect(bookingA.every((event) => event.domain === 'booking-load')).toBe(true)
  })
})


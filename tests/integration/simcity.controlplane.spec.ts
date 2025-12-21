import { describe, it, expect, beforeEach } from 'vitest'
import { simCityStart, simCityStop, simCityTick, simCityStatus } from '@/app/api/ops/controlplane/_lib/simcity'

describe('SimCity control plane (integration)', () => {
  beforeEach(() => {
    process.env.DEPLOY_ENV = 'test'
    process.env.SIMCITY_ALLOWED_ENVS = 'test,staging,recovery'
    try {
      simCityStop()
    } catch {
      // ignore if not allowed/running
    }
  })

  it('produces deterministic events for the same seed/config', async () => {
    const cfg = {
      seed: 123,
      tickRateMs: 0,
      failureProbabilityByDomain: { db: 0.5, storage: 0.0 },
      scenarios: ['baseline'],
    }

    simCityStart(cfg)
    const eventsA = []
    for (let i = 0; i < 10; i += 1) {
      eventsA.push(...(await simCityTick()))
    }
    simCityStop()

    simCityStart(cfg)
    const eventsB = []
    for (let i = 0; i < 10; i += 1) {
      eventsB.push(...(await simCityTick()))
    }
    simCityStop()

    expect(eventsA).toStrictEqual(eventsB)
  })

  it('start → ticks → stop exposes stable status snapshot', async () => {
    simCityStart({ seed: 1, tickRateMs: 0, scenarios: ['baseline'] })
    await simCityTick()
    await simCityTick()
    const running = simCityStatus()
    expect(running.running).toBe(true)
    expect(running.tick).toBe(2)
    expect(running.activeScenarios).toEqual(['baseline'])

    const stopped = simCityStop()
    expect(stopped.running).toBe(false)
    expect(stopped.tick).toBe(2)
  })
})


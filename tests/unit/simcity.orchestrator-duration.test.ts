import { afterEach, describe, expect, it, vi } from 'vitest'
import { getOrchestrator } from '@/lib/simcity/orchestrator'

describe('SimCity orchestrator durations', () => {
  afterEach(async () => {
    vi.useRealTimers()

    const orchestrator = getOrchestrator()
    if (orchestrator.isRunning()) {
      await orchestrator.stop()
    }
  })

  it('auto-stops vendor SLA runs after 30 minutes when no duration is provided', async () => {
    vi.useFakeTimers()

    const orchestrator = getOrchestrator()
    if (orchestrator.isRunning()) {
      await orchestrator.stop()
    }

    await orchestrator.start({
      scenario: 'vendor_sla',
      policies: {
        tickSpeedMs: 60000, // keep interval churn low for the test
        minutesPerTick: 5,
        customerSpawnRate: 0,
        vendorSpawnRate: 0,
        maxConcurrentAgents: 0,
      },
    })

    await vi.advanceTimersByTimeAsync(29 * 60 * 1000)
    expect(orchestrator.isRunning()).toBe(true)

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000)

    expect(orchestrator.isRunning()).toBe(false)
    expect(orchestrator.getRunInfo().finishedAt).toBeDefined()
  })
})

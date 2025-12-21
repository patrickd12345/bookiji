import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateProposals } from '@/app/api/ops/controlplane/_lib/simcity-proposals'
import type { SimCityConfig } from '@/app/api/ops/controlplane/_lib/simcity'
import type { SimCityState } from '@/app/api/ops/controlplane/_lib/simcity-proposals'
import type { SimCityEventEnvelope } from '@/app/api/ops/controlplane/_lib/simcity-types'
import * as simcityLLM from '@/app/api/ops/controlplane/_lib/simcity-llm'

describe('SimCity proposals (unit)', () => {
  beforeEach(() => {
    process.env.DEPLOY_ENV = 'test'
    process.env.SIMCITY_ALLOWED_ENVS = 'test,staging,recovery'
    vi.clearAllMocks()
  })

  function createMockState(
    tick: number,
    config: SimCityConfig,
    events: SimCityEventEnvelope[] = []
  ): SimCityState {
    return {
      tick,
      config,
      events,
    }
  }

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

  it('returns empty array when proposals are disabled', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
      proposals: { mode: 'off' },
    }
    const state = createMockState(10, config)
    const proposals = await generateProposals(state, config)
    expect(proposals).toEqual([])
  })

  it('returns empty array when proposals config is missing', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
    }
    const state = createMockState(10, config)
    const proposals = await generateProposals(state, config)
    expect(proposals).toEqual([])
  })

  it('generates rule-based proposals for load spikes', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
      enabledDomains: ['booking-load'],
      proposals: {
        mode: 'rules',
        maxPerTick: 5,
        minConfidence: 0.6,
      },
    }

    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 8, 'booking-load', 'load_spike', { severity: 3 }),
      createMockEvent('evt2', 9, 'booking-load', 'load_spike', { severity: 4 }),
    ]

    const state = createMockState(10, config, events)
    const proposals = await generateProposals(state, config)

    expect(proposals.length).toBeGreaterThan(0)
    const throttleProposal = proposals.find((p) => p.action === 'throttle_booking_acceptance')
    expect(throttleProposal).toBeDefined()
    expect(throttleProposal?.source).toBe('rules')
    expect(throttleProposal?.confidence).toBeGreaterThanOrEqual(0.6)
  })

  it('generates rule-based proposals for latency jitter', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
      enabledDomains: ['booking-load'],
      proposals: {
        mode: 'rules',
        maxPerTick: 5,
        minConfidence: 0.6,
      },
    }

    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 9, 'booking-load', 'latency_jitter', { ms: 150 }),
    ]

    const state = createMockState(10, config, events)
    const proposals = await generateProposals(state, config)

    expect(proposals.length).toBeGreaterThan(0)
    const preWarmProposal = proposals.find((p) => p.action === 'pre_warm_capacity')
    expect(preWarmProposal).toBeDefined()
    expect(preWarmProposal?.source).toBe('rules')
  })

  it('generates rule-based proposals for soft failures', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
      enabledDomains: ['booking-load'],
      proposals: {
        mode: 'rules',
        maxPerTick: 5,
        minConfidence: 0.6,
      },
    }

    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 9, 'booking-load', 'soft_failure', { target: 'payment', probability: 0.3 }),
    ]

    const state = createMockState(10, config, events)
    const proposals = await generateProposals(state, config)

    expect(proposals.length).toBeGreaterThan(0)
    const contingencyProposal = proposals.find((p) => p.action === 'enable_contingency_path')
    expect(contingencyProposal).toBeDefined()
    expect(contingencyProposal?.source).toBe('rules')
  })

  it('filters proposals below minConfidence threshold', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
      enabledDomains: ['booking-load'],
      proposals: {
        mode: 'rules',
        maxPerTick: 5,
        minConfidence: 0.9, // High threshold
      },
    }

    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 9, 'booking-load', 'latency_jitter', { ms: 150 }),
    ]

    const state = createMockState(10, config, events)
    const proposals = await generateProposals(state, config)

    // latency_jitter proposals have confidence 0.7, which is below 0.9
    const preWarmProposal = proposals.find((p) => p.action === 'pre_warm_capacity')
    expect(preWarmProposal).toBeUndefined()
  })

  it('enforces maxPerTick limit', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
      enabledDomains: ['booking-load'],
      proposals: {
        mode: 'rules',
        maxPerTick: 2,
        minConfidence: 0.6,
      },
    }

    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 8, 'booking-load', 'load_spike', { severity: 3 }),
      createMockEvent('evt2', 9, 'booking-load', 'load_spike', { severity: 4 }),
      createMockEvent('evt3', 9, 'booking-load', 'latency_jitter', { ms: 150 }),
      createMockEvent('evt4', 9, 'booking-load', 'soft_failure', { target: 'payment', probability: 0.3 }),
    ]

    const state = createMockState(10, config, events)
    const proposals = await generateProposals(state, config)

    expect(proposals.length).toBeLessThanOrEqual(2)
  })

  it('deduplicates proposals by domain+action', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
      enabledDomains: ['booking-load'],
      proposals: {
        mode: 'rules',
        maxPerTick: 10,
        minConfidence: 0.6,
      },
    }

    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 8, 'booking-load', 'load_spike', { severity: 3 }),
      createMockEvent('evt2', 9, 'booking-load', 'load_spike', { severity: 4 }),
      createMockEvent('evt3', 9, 'booking-load', 'load_spike', { severity: 5 }),
    ]

    const state = createMockState(10, config, events)
    const proposals = await generateProposals(state, config)

    const throttleProposals = proposals.filter((p) => p.action === 'throttle_booking_acceptance')
    expect(throttleProposals.length).toBe(1) // Should be deduplicated
  })

  it('generates deterministic proposal IDs for same input', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
      enabledDomains: ['booking-load'],
      proposals: {
        mode: 'rules',
        maxPerTick: 5,
        minConfidence: 0.6,
      },
    }

    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 9, 'booking-load', 'load_spike', { severity: 3 }),
      createMockEvent('evt2', 9, 'booking-load', 'load_spike', { severity: 4 }),
    ]

    const state1 = createMockState(10, config, events)
    const proposals1 = await generateProposals(state1, config)

    const state2 = createMockState(10, config, events)
    const proposals2 = await generateProposals(state2, config)

    expect(proposals1).toStrictEqual(proposals2)
    expect(proposals1.length).toBeGreaterThan(0)
    proposals1.forEach((p, i) => {
      expect(p.id).toBe(proposals2[i].id)
    })
  })

  it('handles LLM failure gracefully (fail-closed)', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
      enabledDomains: ['booking-load'],
      proposals: {
        mode: 'llm',
        maxPerTick: 5,
        minConfidence: 0.6,
      },
    }

    // Mock LLM to return empty array (simulating failure)
    vi.spyOn(simcityLLM, 'generateLLMProposals').mockResolvedValue([])

    const state = createMockState(10, config, [])
    const proposals = await generateProposals(state, config)

    // Should return empty array, not throw
    expect(proposals).toEqual([])
  })

  it('validates proposal domain is enabled', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
      enabledDomains: ['booking-load'], // Only booking-load enabled
      proposals: {
        mode: 'rules',
        maxPerTick: 5,
        minConfidence: 0.6,
      },
    }

    // Mock LLM to return proposal for disabled domain
    vi.spyOn(simcityLLM, 'generateLLMProposals').mockResolvedValue([
      {
        domain: 'disabled-domain',
        action: 'some_action',
        description: 'Test proposal',
        confidence: 0.8,
      },
    ])

    const state = createMockState(10, config, [])
    const proposals = await generateProposals(state, config)

    // Should filter out proposals for disabled domains
    const disabledDomainProposals = proposals.filter((p) => p.domain === 'disabled-domain')
    expect(disabledDomainProposals.length).toBe(0)
  })

  it('sorts proposals deterministically', async () => {
    const config: SimCityConfig = {
      seed: 42,
      tickRateMs: 1000,
      enabledDomains: ['booking-load'],
      proposals: {
        mode: 'rules',
        maxPerTick: 10,
        minConfidence: 0.6,
      },
    }

    const events: SimCityEventEnvelope[] = [
      createMockEvent('evt1', 9, 'booking-load', 'load_spike', { severity: 3 }),
      createMockEvent('evt2', 9, 'booking-load', 'latency_jitter', { ms: 150 }),
      createMockEvent('evt3', 9, 'booking-load', 'soft_failure', { target: 'payment', probability: 0.3 }),
    ]

    const state1 = createMockState(10, config, events)
    const proposals1 = await generateProposals(state1, config)

    const state2 = createMockState(10, config, events)
    const proposals2 = await generateProposals(state2, config)

    // Should be sorted in same order
    expect(proposals1.map((p) => `${p.domain}:${p.action}`)).toEqual(
      proposals2.map((p) => `${p.domain}:${p.action}`)
    )
  })
})


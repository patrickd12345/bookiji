import type { SimCityConfig, SimCityEvent } from './simcity'

export type TickContext = {
  tick: number
  now: string
  config: SimCityConfig
  rand: () => number
  makeEventId: (suffix: string) => string
}

export interface SimCityDomain {
  name: string
  onTick: (ctx: TickContext) => SimCityEvent[]
}

type BookingLoadDomainConfig = {
  spikeProbability?: number
  maxSeverity?: number
  latencyJitterProbability?: number
  softFailureProbability?: number
}

function clampProbability(value: unknown, fallback: number): number {
  const asNumber = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(asNumber)) return fallback
  return Math.max(0, Math.min(1, asNumber))
}

function intFrom(value: unknown, fallback: number, min: number, max: number): number {
  const asNumber = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(asNumber)) return fallback
  return Math.max(min, Math.min(max, Math.floor(asNumber)))
}

function resolveBookingLoadConfig(config: SimCityConfig): Required<BookingLoadDomainConfig> {
  const raw = (config.domains?.['booking-load'] ?? {}) as BookingLoadDomainConfig
  return {
    spikeProbability: clampProbability(raw.spikeProbability, 0.1),
    maxSeverity: intFrom(raw.maxSeverity, 5, 1, 10),
    latencyJitterProbability: clampProbability(raw.latencyJitterProbability, 0.25),
    softFailureProbability: clampProbability(raw.softFailureProbability, 0.05),
  }
}

function createBookingLoadDomain(): SimCityDomain {
  return {
    name: 'booking-load',
    onTick: (ctx) => {
      const emitted: SimCityEvent[] = []
      const cfg = resolveBookingLoadConfig(ctx.config)

      if (ctx.rand() < cfg.spikeProbability) {
        const severity = 1 + Math.floor(ctx.rand() * cfg.maxSeverity)
        emitted.push({
          id: ctx.makeEventId(`booking_load_spike_${severity}`),
          type: 'LOAD_SPIKE',
          timestamp: ctx.now,
          tick: ctx.tick,
          domain: 'booking',
          severity,
        })
      }

      if (ctx.config.latency && ctx.rand() < cfg.latencyJitterProbability) {
        const p50 = Math.max(0, Math.floor(ctx.config.latency.p50Ms))
        const p95 = Math.max(p50, Math.floor(ctx.config.latency.p95Ms))
        const jitterMs = Math.round(p50 + (p95 - p50) * ctx.rand())
        emitted.push({
          id: ctx.makeEventId(`booking_latency_${jitterMs}`),
          type: 'LATENCY_JITTER',
          timestamp: ctx.now,
          tick: ctx.tick,
          domain: 'booking',
          ms: jitterMs,
        })
      }

      if (ctx.rand() < cfg.softFailureProbability) {
        const probability = clampProbability(ctx.rand(), 0)
        emitted.push({
          id: ctx.makeEventId(`payment_soft_failure_${Math.round(probability * 1000)}`),
          type: 'SOFT_FAILURE',
          timestamp: ctx.now,
          tick: ctx.tick,
          domain: 'payment',
          probability,
        })
      }

      return emitted
    },
  }
}

export function resolveActiveDomains(config: SimCityConfig): SimCityDomain[] {
  const explicit = config.enabledDomains?.length ? config.enabledDomains : ['booking-load']
  const normalized = [...new Set(explicit.filter(Boolean))].sort()
  const out: SimCityDomain[] = []

  for (const name of normalized) {
    if (name === 'booking-load') out.push(createBookingLoadDomain())
  }

  return out
}


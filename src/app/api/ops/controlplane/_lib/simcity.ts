import { resolveActiveDomains } from './simcity-domains'

type SimCityLatencyConfig = {
  p50Ms: number
  p95Ms: number
}

export type SimCityConfig = {
  seed: number
  tickRateMs: number
  latency?: SimCityLatencyConfig
  failureProbabilityByDomain?: Record<string, number>
  scenarios?: string[]
  enabledDomains?: string[]
  domains?: Record<string, unknown>
}

export type SimCityEvent =
  | {
      id: string
      type: 'tick'
      timestamp: string
      tick: number
    }
  | {
      id: string
      type: 'fault_injected'
      timestamp: string
      tick: number
      domain: string
      faultId: string
    }
  | {
      id: string
      type: 'LOAD_SPIKE'
      timestamp: string
      tick: number
      domain: string
      severity: number
    }
  | {
      id: string
      type: 'LATENCY_JITTER'
      timestamp: string
      tick: number
      domain: string
      ms: number
    }
  | {
      id: string
      type: 'SOFT_FAILURE'
      timestamp: string
      tick: number
      domain: string
      probability: number
    }

export type SimCityStatus = {
  running: boolean
  startedAt?: string
  tick: number
  config?: SimCityConfig
  activeScenarios: string[]
  activeDomains: string[]
  eventsByDomain: Record<string, SimCityEvent[]>
  lastInjectedFault?: { domain: string; faultId: string; tick: number; timestamp: string }
  lastEvent?: SimCityEvent
  events: SimCityEvent[]
}

function getEventDomain(event: SimCityEvent): string {
  if (event.type === 'tick') return 'engine'
  return event.domain
}

function parseAllowList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function ensureSimCityAllowed(): void {
  const deployEnv = process.env.DEPLOY_ENV?.trim() ?? ''
  const allowed = parseAllowList(process.env.SIMCITY_ALLOWED_ENVS).map((v) => v.toLowerCase())

  if (deployEnv.toLowerCase() === 'production') {
    throw new Error('SimCity is not allowed in production.')
  }
  if (!deployEnv) {
    throw new Error('DEPLOY_ENV is required to run SimCity control plane.')
  }
  if (allowed.length === 0) {
    throw new Error('SIMCITY_ALLOWED_ENVS is required and must be non-empty.')
  }
  if (!allowed.includes(deployEnv.toLowerCase())) {
    throw new Error(`SimCity is not allowed in DEPLOY_ENV="${deployEnv}".`)
  }
}

function createRng(seed: number) {
  let state = seed >>> 0
  return () => {
    // LCG constants from Numerical Recipes
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

function clampProbability(value: unknown): number {
  const asNumber = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(asNumber)) return 0
  return Math.max(0, Math.min(1, asNumber))
}

function normalizeConfig(config: SimCityConfig): SimCityConfig {
  return {
    seed: Number.isFinite(config.seed) ? config.seed : 1,
    tickRateMs: Math.max(0, Math.floor(config.tickRateMs)),
    latency: config.latency
      ? {
          p50Ms: Math.max(0, Math.floor(config.latency.p50Ms)),
          p95Ms: Math.max(0, Math.floor(config.latency.p95Ms)),
        }
      : undefined,
    failureProbabilityByDomain: config.failureProbabilityByDomain
      ? Object.fromEntries(
          Object.entries(config.failureProbabilityByDomain).map(([domain, probability]) => [
            domain,
            clampProbability(probability),
          ])
        )
      : undefined,
    scenarios: Array.isArray(config.scenarios) ? config.scenarios.filter(Boolean) : [],
    enabledDomains: Array.isArray(config.enabledDomains) ? config.enabledDomains.filter(Boolean) : undefined,
    domains: config.domains && typeof config.domains === 'object' ? config.domains : undefined,
  }
}

function makeEventId(tick: number, suffix: string) {
  return `simcity_${tick}_${suffix}`
}

const MAX_EVENTS = 200

type EngineState = {
  running: boolean
  startedAt?: string
  tick: number
  config?: SimCityConfig
  rng?: () => number
  timer?: NodeJS.Timeout | null
  events: SimCityEvent[]
  lastInjectedFault?: SimCityStatus['lastInjectedFault']
  lastEvent?: SimCityEvent
}

const state: EngineState = {
  running: false,
  tick: 0,
  timer: null,
  events: [],
}

function pushEvent(event: SimCityEvent) {
  state.events.push(event)
  if (state.events.length > MAX_EVENTS) {
    state.events.splice(0, state.events.length - MAX_EVENTS)
  }
  state.lastEvent = event
}

export function simCityStart(config: SimCityConfig): SimCityStatus {
  ensureSimCityAllowed()
  if (state.running) {
    throw new Error('SimCity is already running.')
  }

  const normalized = normalizeConfig(config)
  state.config = normalized
  state.rng = createRng(normalized.seed)
  state.tick = 0
  state.startedAt = new Date().toISOString()
  state.lastInjectedFault = undefined
  state.events = []
  state.lastEvent = undefined
  state.running = true

  if (state.timer) {
    clearInterval(state.timer)
    state.timer = null
  }

  if (normalized.tickRateMs > 0) {
    state.timer = setInterval(() => {
      try {
        simCityTick()
      } catch {
        // fail closed: stop ticking if something goes wrong
        simCityStop()
      }
    }, normalized.tickRateMs)
  }

  return simCityStatus()
}

export function simCityStop(): SimCityStatus {
  ensureSimCityAllowed()
  if (state.timer) {
    clearInterval(state.timer)
    state.timer = null
  }
  state.running = false
  return simCityStatus()
}

export function simCityTick(): SimCityEvent[] {
  if (!state.running) {
    throw new Error('SimCity is not running.')
  }
  if (!state.config || !state.rng) {
    throw new Error('SimCity is not initialized.')
  }

  state.tick += 1
  const now = new Date().toISOString()
  const emitted: SimCityEvent[] = []

  const tickEvent: SimCityEvent = {
    id: makeEventId(state.tick, 'tick'),
    type: 'tick',
    timestamp: now,
    tick: state.tick,
  }
  pushEvent(tickEvent)
  emitted.push(tickEvent)

  const domains = resolveActiveDomains(state.config)
  for (const domain of domains) {
    const domainEvents = domain.onTick({
      tick: state.tick,
      now,
      config: state.config,
      rand: state.rng,
      makeEventId: (suffix) => makeEventId(state.tick, suffix),
    })
    for (const event of domainEvents) {
      pushEvent(event)
      emitted.push(event)
    }
  }

  const probabilities = state.config.failureProbabilityByDomain ?? {}
  const probabilityDomains = Object.keys(probabilities).sort()
  for (const domain of probabilityDomains) {
    const probability = probabilities[domain] ?? 0
    const roll = state.rng()
    if (roll < probability) {
      const faultId = `fault_${domain}_${state.tick}`
      const faultEvent: SimCityEvent = {
        id: makeEventId(state.tick, `fault_${domain}`),
        type: 'fault_injected',
        timestamp: now,
        tick: state.tick,
        domain,
        faultId,
      }
      pushEvent(faultEvent)
      emitted.push(faultEvent)
      state.lastInjectedFault = { domain, faultId, tick: state.tick, timestamp: now }
      break
    }
  }

  return emitted
}

export function simCityStatus(): SimCityStatus {
  ensureSimCityAllowed()
  const activeDomains = state.config ? resolveActiveDomains(state.config).map((d) => d.name) : []
  const eventsByDomain: Record<string, SimCityEvent[]> = {}
  for (const event of state.events) {
    const domain = getEventDomain(event)
    const bucket = eventsByDomain[domain] ?? []
    bucket.push(event)
    eventsByDomain[domain] = bucket
  }
  return {
    running: state.running,
    startedAt: state.startedAt,
    tick: state.tick,
    config: state.config,
    activeScenarios: state.config?.scenarios ?? [],
    activeDomains,
    eventsByDomain,
    lastInjectedFault: state.lastInjectedFault,
    lastEvent: state.lastEvent,
    events: [...state.events],
  }
}

import { resolveActiveDomains } from './simcity-domains'
import { makeEventId } from './simcity-hash'
import type {
  SimCityEvent,
  SimCityEventEnvelope,
  SimCityEventSpec,
  SimCityProposalConfig,
  ProposalMode,
  SimCityProposal,
} from './simcity-types'
import { generateProposals } from './simcity-proposals'

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
  proposals?: SimCityProposalConfig
}

export type SimCityStatus = {
  running: boolean
  startedAt?: string
  tick: number
  config?: SimCityConfig
  activeScenarios: string[]
  activeDomains: string[]
  eventsByDomain: Record<string, SimCityEventEnvelope[]>
  lastInjectedFault?: { domain: string; faultId: string; tick: number; timestamp: string }
  lastEvent?: SimCityEventEnvelope
  events: SimCityEventEnvelope[]
}

function emitEvent(spec: SimCityEventSpec): SimCityEvent {
  const cfg = state.config
  if (!cfg) throw new Error('SimCity is not initialized.')

  return {
    id: makeEventId({
      seed: cfg.seed,
      tick: state.tick,
      domain: spec.domain,
      type: spec.type,
      payload: spec.payload,
    }),
    tick: state.tick,
    domain: spec.domain,
    type: spec.type,
    payload: spec.payload,
  }
}

function wrapEnvelope(event: SimCityEvent): SimCityEventEnvelope {
  const cfg = state.config
  if (!cfg) throw new Error('SimCity is not initialized.')

  return {
    version: 1,
    seed: cfg.seed,
    generatedAtTick: state.tick,
    event,
  }
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

function normalizeProposalConfig(
  proposals: SimCityProposalConfig | undefined,
  deployEnv: string
): SimCityProposalConfig | undefined {
  // Fail-closed: invalid config or production → proposals OFF
  if (!proposals) {
    return undefined
  }

  const deployEnvLower = deployEnv.toLowerCase()
  if (deployEnvLower === 'production') {
    return undefined
  }

  const validModes: ProposalMode[] = ['llm', 'rules', 'hybrid', 'off']
  const mode = validModes.includes(proposals.mode) ? proposals.mode : 'off'

  if (mode === 'off') {
    return undefined
  }

  const maxPerTick = typeof proposals.maxPerTick === 'number' && Number.isFinite(proposals.maxPerTick)
    ? Math.max(1, Math.min(10, Math.floor(proposals.maxPerTick)))
    : 3

  const minConfidence = typeof proposals.minConfidence === 'number' && Number.isFinite(proposals.minConfidence)
    ? clampProbability(proposals.minConfidence)
    : 0.6

  return {
    mode,
    maxPerTick,
    minConfidence,
  }
}

function normalizeConfig(config: SimCityConfig): SimCityConfig {
  const deployEnv = process.env.DEPLOY_ENV?.trim() ?? ''
  const proposals = normalizeProposalConfig(config.proposals, deployEnv)

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
    proposals,
  }
}

const MAX_EVENTS = 500

type EngineState = {
  running: boolean
  startedAt?: string
  tick: number
  config?: SimCityConfig
  rng?: () => number
  timer?: NodeJS.Timeout | null
  events: SimCityEventEnvelope[]
  lastInjectedFault?: SimCityStatus['lastInjectedFault']
  lastEvent?: SimCityEventEnvelope
}

const state: EngineState = {
  running: false,
  tick: 0,
  timer: null,
  events: [],
}

function pushEvent(event: SimCityEvent) {
  const envelope = wrapEnvelope(event)
  state.events.push(envelope)
  if (state.events.length > MAX_EVENTS) {
    state.events.splice(0, state.events.length - MAX_EVENTS)
  }
  state.lastEvent = envelope
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
      // Use void to explicitly ignore promise (tick is async for proposals)
      void (async () => {
        try {
          await simCityTick()
        } catch {
          // fail closed: stop ticking if something goes wrong
          simCityStop()
        }
      })()
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

export async function simCityTick(): Promise<SimCityEventEnvelope[]> {
  if (!state.running) {
    throw new Error('SimCity is not running.')
  }
  if (!state.config || !state.rng) {
    throw new Error('SimCity is not initialized.')
  }

  state.tick += 1
  const emitted: SimCityEventEnvelope[] = []

  const tickEvent = emitEvent({ domain: 'engine', type: 'tick', payload: {} })
  pushEvent(tickEvent)
  emitted.push(wrapEnvelope(tickEvent))

  const domains = resolveActiveDomains(state.config)
  for (const domain of domains) {
    const domainEvents = domain.onTick({
      tick: state.tick,
      config: state.config,
      rand: state.rng,
    })
    for (const eventSpec of domainEvents) {
      const event = emitEvent(eventSpec)
      pushEvent(event)
      emitted.push(wrapEnvelope(event))
    }
  }

  const probabilities = state.config.failureProbabilityByDomain ?? {}
  const probabilityDomains = Object.keys(probabilities).sort()
  for (const domain of probabilityDomains) {
    const probability = probabilities[domain] ?? 0
    const roll = state.rng()
    if (roll < probability) {
      const faultId = `fault_${domain}_${state.tick}`
      const faultEvent = emitEvent({
        domain: 'engine',
        type: 'fault_injected',
        payload: { domain, faultId },
      })
      pushEvent(faultEvent)
      emitted.push(wrapEnvelope(faultEvent))
      state.lastInjectedFault = { domain, faultId, tick: state.tick, timestamp: new Date().toISOString() }
      break
    }
  }

  // Phase 4: Generate proposals if enabled
  if (state.config.proposals && state.config.proposals.mode !== 'off') {
    try {
      const proposals = await generateProposals(
        {
          tick: state.tick,
          config: state.config,
          events: state.events,
        },
        state.config
      )

      // Emit each proposal as a proposal.generated event
      for (const proposal of proposals) {
        const proposalEvent = emitEvent({
          domain: 'engine',
          type: 'proposal.generated',
          payload: {
            proposalId: proposal.id,
            domain: proposal.domain,
            action: proposal.action,
            description: proposal.description,
            confidence: proposal.confidence,
            evidenceEventIds: proposal.evidenceEventIds,
            source: proposal.source,
          },
        })
        pushEvent(proposalEvent)
        emitted.push(wrapEnvelope(proposalEvent))
      }
    } catch (error) {
      // Fail closed: if proposal generation fails, continue without proposals
      // Log error but don't throw (proposals are advisory only)
      console.warn('SimCity proposal generation failed:', error)
    }
  }

  return emitted
}

export function simCityGetEvents(opts?: {
  sinceTick?: number
  limit?: number
  domain?: string
}): SimCityEventEnvelope[] {
  ensureSimCityAllowed()

  const sinceTick = opts?.sinceTick
  const domain = opts?.domain?.trim()
  const limit = Math.max(0, Math.min(MAX_EVENTS, Math.floor(opts?.limit ?? 100)))

  const filtered = state.events.filter((envelope) => {
    if (typeof sinceTick === 'number' && Number.isFinite(sinceTick) && envelope.event.tick <= sinceTick) {
      return false
    }
    if (domain && envelope.event.domain !== domain) {
      return false
    }
    return true
  })

  return limit > 0 ? filtered.slice(-limit) : []
}

export function simCityCursor(): { seed: number | null; tick: number } {
  ensureSimCityAllowed()
  return { seed: state.config?.seed ?? null, tick: state.tick }
}

export function simCityStatus(): SimCityStatus {
  ensureSimCityAllowed()
  const activeDomains = state.config ? resolveActiveDomains(state.config).map((d) => d.name) : []
  const eventsByDomain: Record<string, SimCityEventEnvelope[]> = {}
  for (const event of state.events) {
    const domain = event.event.domain
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

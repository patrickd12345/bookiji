/**
 * Proposal Engine for SimCity Phase 4
 *
 * Responsibilities:
 * - Collect recent event window
 * - Generate proposal drafts (LLM / rules)
 * - Validate + score proposals
 * - Enforce caps & thresholds
 * - Return finalized proposals
 */

import { stableHash } from './simcity-hash'
import type {
  SimCityProposal,
  SimCityProposalConfig,
  SimCityEvent,
  SimCityEventEnvelope,
} from './simcity-types'
import type { SimCityConfig } from './simcity'
import { generateLLMProposals, normalizeLLMConfidence, type LLMProposalDraft } from './simcity-llm'
import { resolveActiveDomains } from './simcity-domains'

type ProposalDraftWithSource = LLMProposalDraft & {
  _source?: 'llm' | 'rules'
}

export type SimCityState = {
  tick: number
  config: SimCityConfig
  events: SimCityEventEnvelope[]
}

/**
 * Generate rule-based proposals from recent events.
 * These are deterministic and don't require LLM.
 */
function generateRulesProposals(
  state: SimCityState,
  recentEvents: SimCityEventEnvelope[]
): LLMProposalDraft[] {
  const proposals: LLMProposalDraft[] = []
  const enabledDomains = resolveActiveDomains(state.config).map((d) => d.name)

  // Analyze recent events for patterns
  const eventsByDomain: Record<string, SimCityEventEnvelope[]> = {}
  for (const envelope of recentEvents) {
    const domain = envelope.event.domain
    if (!eventsByDomain[domain]) {
      eventsByDomain[domain] = []
    }
    eventsByDomain[domain].push(envelope)
  }

  // Rule 1: If load spikes detected, suggest throttling
  const loadSpikes = recentEvents.filter(
    (e) => e.event.domain === 'booking-load' && e.event.type === 'load_spike'
  )
  if (loadSpikes.length >= 2) {
    proposals.push({
      domain: 'booking-load',
      action: 'throttle_booking_acceptance',
      description: 'Multiple load spikes detected. Consider throttling booking acceptance rate.',
      confidence: 0.75,
      evidenceHints: loadSpikes.slice(0, 3).map((e) => e.event.id),
    })
  }

  // Rule 2: If latency jitter detected, suggest capacity pre-warming
  const latencyJitters = recentEvents.filter(
    (e) => e.event.domain === 'booking-load' && e.event.type === 'latency_jitter'
  )
  if (latencyJitters.length >= 1) {
    proposals.push({
      domain: 'booking-load',
      action: 'pre_warm_capacity',
      description: 'Latency jitter detected. Consider pre-warming capacity to reduce latency.',
      confidence: 0.7,
      evidenceHints: latencyJitters.slice(0, 2).map((e) => e.event.id),
    })
  }

  // Rule 3: If soft failures detected, suggest enabling contingency path
  const softFailures = recentEvents.filter(
    (e) => e.event.domain === 'booking-load' && e.event.type === 'soft_failure'
  )
  if (softFailures.length >= 1) {
    proposals.push({
      domain: 'booking-load',
      action: 'enable_contingency_path',
      description: 'Soft failures detected. Consider enabling contingency path for resilience.',
      confidence: 0.8,
      evidenceHints: softFailures.slice(0, 2).map((e) => e.event.id),
    })
  }

  // Rule 4: If high event rate in a domain, suggest increasing provider radius
  for (const domain of enabledDomains) {
    const domainEvents = eventsByDomain[domain] || []
    if (domainEvents.length >= 5) {
      proposals.push({
        domain,
        action: 'increase_provider_radius',
        description: `High event rate in ${domain}. Consider increasing provider radius to distribute load.`,
        confidence: 0.65,
        evidenceHints: domainEvents.slice(0, 5).map((e) => e.event.id),
      })
      break // Only one per domain
    }
  }

  return proposals
}

/**
 * Validate and score a proposal draft.
 * Returns null if proposal should be rejected.
 */
function validateProposal(
  draft: LLMProposalDraft,
  state: SimCityState,
  config: SimCityProposalConfig,
  knownEventIds: Set<string>
): SimCityProposal | null {
  const enabledDomains = resolveActiveDomains(state.config).map((d) => d.name)

  // Validation: domain must be enabled
  if (!enabledDomains.includes(draft.domain)) {
    return null
  }

  // Validation: action must be non-empty
  if (!draft.action || typeof draft.action !== 'string' || draft.action.trim().length === 0) {
    return null
  }

  // Validation: description must be non-empty
  if (!draft.description || typeof draft.description !== 'string' || draft.description.trim().length === 0) {
    return null
  }

  // Confidence resolution
  let confidence: number
  if (draft.confidence !== undefined) {
    confidence = normalizeLLMConfidence(draft.confidence)
  } else {
    // Default confidence based on source
    confidence = 0.5
  }

  // Validation: confidence must meet minimum threshold
  if (confidence < config.minConfidence) {
    return null
  }

  // Validation: evidence event IDs must exist
  const evidenceEventIds = (draft.evidenceHints || [])
    .filter((id) => typeof id === 'string' && knownEventIds.has(id))

  // Generate deterministic proposal ID (content-hashed, no timestamps)
  const proposalId = stableHash(
    `${state.config.seed}:${state.tick}:${draft.domain}:${draft.action}:${confidence}:${evidenceEventIds.sort().join(',')}`
  )

  return {
    id: proposalId,
    tick: state.tick,
    domain: draft.domain,
    action: draft.action,
    description: draft.description,
    confidence,
    evidenceEventIds,
    source: 'llm', // Will be overridden if from rules
  }
}

/**
 * Deduplicate proposals by (domain + action) pair.
 * Keeps the proposal with highest confidence.
 */
function deduplicateProposals(proposals: SimCityProposal[]): SimCityProposal[] {
  const seen = new Map<string, SimCityProposal>()

  for (const proposal of proposals) {
    const key = `${proposal.domain}:${proposal.action}`
    const existing = seen.get(key)

    if (!existing || proposal.confidence > existing.confidence) {
      seen.set(key, proposal)
    }
  }

  return Array.from(seen.values())
}

/**
 * Generate proposals for the current SimCity state.
 *
 * This function is deterministic:
 * - Same seed + config + event stream → same proposals
 * - Proposal IDs are content-hashed (no timestamps)
 * - Sorting is deterministic
 *
 * @param state - Current SimCity state
 * @param config - SimCity configuration
 * @returns Array of validated proposals (empty if proposals disabled)
 */
export async function generateProposals(
  state: SimCityState,
  config: SimCityConfig
): Promise<SimCityProposal[]> {
  const proposalConfig = config.proposals
  if (!proposalConfig) {
    return []
  }

  if (proposalConfig.mode === 'off') {
    return []
  }

  // Collect recent event window (last 20 ticks or last 50 events, whichever is smaller)
  const recentWindow = Math.min(20, state.tick)
  const recentEvents = state.events
    .filter((e) => e.generatedAtTick > state.tick - recentWindow)
    .slice(-50)

  // Build set of known event IDs for validation
  const knownEventIds = new Set(state.events.map((e) => e.event.id))

  const allDrafts: ProposalDraftWithSource[] = []

  // Generate LLM proposals if mode is 'llm' or 'hybrid'
  if (proposalConfig.mode === 'llm' || proposalConfig.mode === 'hybrid') {
    try {
      const llmDrafts = await generateLLMProposals({
        tick: state.tick,
        recentEvents: recentEvents.map((e) => ({
          id: e.event.id,
          tick: e.event.tick,
          domain: e.event.domain,
          type: e.event.type,
          payload: e.event.payload,
        })),
        enabledDomains: resolveActiveDomains(config).map((d) => d.name),
        config: {
          seed: config.seed,
          scenarios: config.scenarios,
        },
      })
      for (const draft of llmDrafts) {
        allDrafts.push({ ...draft, _source: 'llm' } as ProposalDraftWithSource)
      }
    } catch {
      // Fail closed: continue with rules proposals if LLM fails
    }
  }

  // Generate rules proposals if mode is 'rules' or 'hybrid'
  if (proposalConfig.mode === 'rules' || proposalConfig.mode === 'hybrid') {
    const rulesDrafts = generateRulesProposals(state, recentEvents)
    // Mark rules proposals with source
    for (const draft of rulesDrafts) {
      allDrafts.push({ ...draft, _source: 'rules' } as ProposalDraftWithSource)
    }
  }

  // Validate and score all drafts
  const validated: SimCityProposal[] = []
  for (const draft of allDrafts) {
    const proposal = validateProposal(draft, state, proposalConfig, knownEventIds)
    if (proposal) {
      // Set source from draft metadata
      proposal.source = draft._source ?? 'llm'
      validated.push(proposal)
    }
  }

  // Deduplicate by (domain + action)
  const deduplicated = deduplicateProposals(validated)

  // Sort deterministically (by domain, then action, then confidence desc)
  deduplicated.sort((a, b) => {
    if (a.domain !== b.domain) {
      return a.domain.localeCompare(b.domain)
    }
    if (a.action !== b.action) {
      return a.action.localeCompare(b.action)
    }
    return b.confidence - a.confidence
  })

  // Cap proposals per tick
  const maxPerTick = proposalConfig.maxPerTick ?? 3
  return deduplicated.slice(0, maxPerTick)
}


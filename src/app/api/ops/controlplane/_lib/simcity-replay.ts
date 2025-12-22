/**
 * SimCity Phase 5: Counterfactual Replay Engine
 *
 * This module provides isolated replay functionality that:
 * - Never mutates the live engine state
 * - Runs on a fresh fork instance
 * - Applies interventions at specified ticks
 * - Produces deterministic outputs
 */

import { resolveActiveDomains } from './simcity-domains'
import { makeEventId } from './simcity-hash'
import type {
  SimCityEvent,
  SimCityEventEnvelope,
  SimCityEventSpec,
  SimCityInterventionPlan,
  SimCityReplayVariant,
} from './simcity-types'
import type { SimCityConfig } from './simcity'

export type ReplayEngineState = {
  tick: number
  config: SimCityConfig
  rng: () => number
  events: SimCityEventEnvelope[]
  metricsByTick: Record<number, Record<string, unknown>>
}

function createRng(seed: number) {
  let state = seed >>> 0
  return () => {
    // LCG constants from Numerical Recipes (same as main engine)
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

function emitEvent(
  spec: SimCityEventSpec,
  state: ReplayEngineState
): SimCityEvent {
  return {
    id: makeEventId({
      seed: state.config.seed,
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

function wrapEnvelope(event: SimCityEvent, state: ReplayEngineState): SimCityEventEnvelope {
  return {
    version: 1,
    seed: state.config.seed,
    generatedAtTick: state.tick,
    event,
  }
}

/**
 * Apply an intervention at the current tick.
 * Interventions simulate applying proposals but do not mutate external state.
 */
function applyIntervention(
  intervention: SimCityInterventionPlan,
  state: ReplayEngineState
): SimCityEventEnvelope[] {
  const emitted: SimCityEventEnvelope[] = []

  // Apply proposals as intervention events
  if (intervention.proposals && intervention.proposals.length > 0) {
    for (const proposal of intervention.proposals) {
      const interventionEvent = emitEvent(
        {
          domain: 'engine',
          type: 'intervention.applied',
          payload: {
            proposalId: proposal.id,
            domain: proposal.domain,
            action: proposal.action,
            description: proposal.description,
            confidence: proposal.confidence,
          },
        },
        state
      )
      emitted.push(wrapEnvelope(interventionEvent, state))
    }
  }

  // Apply actions as intervention events
  if (intervention.actions && intervention.actions.length > 0) {
    for (const action of intervention.actions) {
      const interventionEvent = emitEvent(
        {
          domain: action.domain,
          type: 'intervention.applied',
          payload: {
            proposalId: action.proposalId,
            action: action.action,
            parameters: action.parameters || {},
          },
        },
        state
      )
      emitted.push(wrapEnvelope(interventionEvent, state))
    }
  }

  return emitted
}

/**
 * Run a single replay variant from fromTick to toTick with optional interventions.
 * This is completely isolated from the live engine.
 */
export function runReplayVariant(
  seed: number,
  config: SimCityConfig,
  baseEvents: SimCityEventEnvelope[],
  fromTick: number,
  toTick: number,
  interventions: SimCityInterventionPlan[] = []
): SimCityReplayVariant {
  // Create isolated engine state
  const state: ReplayEngineState = {
    tick: fromTick - 1, // Will be incremented to fromTick on first tick
    config,
    rng: createRng(seed),
    events: [],
    metricsByTick: {},
  }

  // Sort interventions by tick
  const sortedInterventions = [...interventions].sort((a, b) => a.atTick - b.atTick)
  let interventionIndex = 0

  // Replay from fromTick to toTick
  for (let currentTick = fromTick; currentTick <= toTick; currentTick++) {
    state.tick = currentTick

    // Emit tick event
    const tickEvent = emitEvent({ domain: 'engine', type: 'tick', payload: {} }, state)
    state.events.push(wrapEnvelope(tickEvent, state))

    // Check if we need to apply interventions at this tick
    while (
      interventionIndex < sortedInterventions.length &&
      sortedInterventions[interventionIndex].atTick === currentTick
    ) {
      const interventionEvents = applyIntervention(sortedInterventions[interventionIndex], state)
      state.events.push(...interventionEvents)
      interventionIndex++
    }

    // Run domains
    const domains = resolveActiveDomains(config)
    for (const domain of domains) {
      const domainEvents = domain.onTick({
        tick: currentTick,
        config,
        rand: state.rng,
      })

      for (const eventSpec of domainEvents) {
        const event = emitEvent(eventSpec, state)
        state.events.push(wrapEnvelope(event, state))
      }

      // Collect metrics if available
      if (domain.getMetrics) {
        const domainMetrics = domain.getMetrics({
          tick: currentTick,
          config,
          rand: state.rng,
        })

        if (!state.metricsByTick[currentTick]) {
          state.metricsByTick[currentTick] = {}
        }
        state.metricsByTick[currentTick][domain.name] = domainMetrics
      }
    }

    // Apply failure probabilities if configured
    const probabilities = config.failureProbabilityByDomain ?? {}
    const probabilityDomains = Object.keys(probabilities).sort()
    for (const domain of probabilityDomains) {
      const probability = probabilities[domain] ?? 0
      const roll = state.rng()
      if (roll < probability) {
        const faultId = `fault_${domain}_${currentTick}`
        const faultEvent = emitEvent(
          {
            domain: 'engine',
            type: 'fault_injected',
            payload: { domain, faultId },
          },
          state
        )
        state.events.push(wrapEnvelope(faultEvent, state))
        break // Only one fault per tick
      }
    }
  }

  // Build summary
  const eventsByDomain: Record<string, number> = {}
  const eventsByType: Record<string, number> = {}

  for (const envelope of state.events) {
    const domain = envelope.event.domain
    const type = envelope.event.type

    eventsByDomain[domain] = (eventsByDomain[domain] || 0) + 1
    eventsByType[type] = (eventsByType[type] || 0) + 1
  }

  return {
    name: 'variant',
    events: state.events,
    metricsByTick: state.metricsByTick,
    summary: {
      totalEvents: state.events.length,
      eventsByDomain,
      eventsByType,
    },
  }
}










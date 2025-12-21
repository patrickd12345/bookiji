/**
 * SimCity Phase 10: Shadow Simulation
 *
 * Simulates production events in SimCity engine without any side effects.
 * Reuses Phase 6 metrics and dials evaluation.
 * No writes, no proposals generated.
 */

import { computeMetricsFromEvents } from './simcity-metric-extractors'
import { evalDials } from './simcity-evaluator'
import { DEFAULT_DIALS } from './simcity-dials'
import type { ShadowEvent, DialStatus, MetricId } from './simcity-types'
import type { SimCityEventEnvelope } from './simcity-types'

/**
 * Simulate shadow events and compute metrics/dials.
 * 
 * Reuses Phase 6 engine exactly.
 * No side effects: no writes, no proposals generated.
 * 
 * @param events Shadow events from production
 * @returns Simulated metrics and dial statuses
 */
export function simulateShadow(events: ShadowEvent[]): {
  simulatedMetrics: Record<MetricId, number>
  simulatedDials: DialStatus[]
} {
  // Transform ShadowEvent[] to SimCityEventEnvelope[] format
  // For Phase 10, we need to map production events to SimCity event format
  // This is a simplified mapping - actual implementation will need proper transformation
  const simCityEvents: SimCityEventEnvelope[] = events.map((shadowEvent, idx) => {
    // Transform production domain event to SimCity event envelope
    // This is a placeholder - real implementation will need domain-specific transformation
    return {
      version: 1,
      seed: 0, // Shadow events don't have a seed
      generatedAtTick: idx, // Use index as tick
      event: {
        id: `shadow-${idx}`,
        tick: idx,
        domain: 'unknown', // Will be extracted from domainEvent in real implementation
        type: 'domain.signal',
        payload: shadowEvent.domainEvent as Record<string, unknown>,
      },
    }
  })

  // Compute metrics using Phase 6 engine
  const simulatedMetrics = computeMetricsFromEvents(simCityEvents)

  // Evaluate dials using Phase 6 engine
  const simulatedDials = evalDials(simulatedMetrics, DEFAULT_DIALS)

  return {
    simulatedMetrics,
    simulatedDials,
  }
}


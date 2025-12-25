/**
 * SimCity Phase 6: Metric Extractors
 *
 * Pure functions that compute metrics from event streams.
 * All functions are deterministic: same input -> same output.
 */

import type { SimCityEventEnvelope, MetricId } from './simcity-types'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { METRICS_REGISTRY } from './simcity-metrics'

/**
 * Compute p95 percentile deterministically from a sorted numeric array.
 */
function computeP95(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil(0.95 * sorted.length) - 1
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))]
}

/**
 * Extract latency values from events.
 * Looks for latency_jitter events or payload.latency fields.
 */
function extractLatencies(events: SimCityEventEnvelope[]): number[] {
  const latencies: number[] = []

  for (const envelope of events) {
    const { type, payload } = envelope.event

    // Check for latency_jitter events
    if (type === 'latency_jitter' && typeof payload.ms === 'number') {
      latencies.push(payload.ms)
    }

    // Check for latency in payload
    if (typeof payload.latency === 'number') {
      latencies.push(payload.latency)
    }
    if (typeof payload.latencyMs === 'number') {
      latencies.push(payload.latencyMs)
    }
  }

  return latencies
}

/**
 * Count error events.
 * Events with type containing 'error' or payload.error === true.
 */
function countErrors(events: SimCityEventEnvelope[]): number {
  let count = 0

  for (const envelope of events) {
    const { type, payload } = envelope.event

    if (type.includes('error') || type.includes('failure') || type.includes('fault')) {
      count++
    } else if (payload.error === true || payload.failed === true) {
      count++
    }
  }

  return count
}

/**
 * Extract capacity/utilization signals from booking-load events.
 */
function extractCapacityUtilization(events: SimCityEventEnvelope[]): number {
  // Look for booking-load events with utilization signals
  for (const envelope of events) {
    if (envelope.event.domain === 'booking-load') {
      const { payload } = envelope.event

      if (typeof payload.utilization === 'number') {
        return Math.max(0, Math.min(1, payload.utilization))
      }
      if (typeof payload.pressure === 'number') {
        // Approximate utilization from pressure (0-1 scale)
        return Math.max(0, Math.min(1, payload.pressure))
      }
      if (typeof payload.load === 'number') {
        // Approximate utilization from load (normalize to 0-1)
        return Math.max(0, Math.min(1, payload.load / 10))
      }
    }
  }

  // Default: no utilization signal found
  return 0
}

/**
 * Extract booking success/drop signals.
 * Since we may not have explicit booking.success events yet, approximate from booking-load signals.
 */
function extractBookingMetrics(events: SimCityEventEnvelope[]): {
  successRate: number
  dropRate: number
} {
  let totalBookingSignals = 0
  let successSignals = 0
  let dropSignals = 0

  for (const envelope of events) {
    const { domain, type, payload } = envelope.event

    // Count booking-related events
    if (domain === 'booking-load' || domain === 'booking') {
      totalBookingSignals++

      // Success indicators
      if (type.includes('success') || type.includes('completed') || payload.success === true) {
        successSignals++
      }

      // Drop indicators
      if (type.includes('drop') || type.includes('reject') || payload.dropped === true) {
        dropSignals++
      }
    }
  }

  // If no booking signals, return defaults
  if (totalBookingSignals === 0) {
    return { successRate: 0, dropRate: 0 }
  }

  // Compute rates
  const successRate = successSignals / totalBookingSignals
  const dropRate = dropSignals / totalBookingSignals

  // If no explicit success/drop signals, approximate from load spikes (high load = lower success)
  if (successSignals === 0 && dropSignals === 0) {
    const loadSpikes = events.filter(
      (e) => e.event.domain === 'booking-load' && e.event.type === 'load_spike'
    ).length

    // Approximate: more load spikes = lower success rate
    const estimatedSuccessRate = Math.max(0, Math.min(1, 1 - loadSpikes / Math.max(1, totalBookingSignals) * 0.1))
    return { successRate: estimatedSuccessRate, dropRate: 1 - estimatedSuccessRate }
  }

  return { successRate, dropRate }
}

/**
 * Extract trust violation rate.
 * Look for trust domain events or violation indicators.
 */
function extractTrustViolationRate(events: SimCityEventEnvelope[]): number {
  let violations = 0
  let trustEvents = 0

  for (const envelope of events) {
    const { domain, type, payload } = envelope.event

    if (domain === 'trust' || domain === 'safety') {
      trustEvents++
      if (type.includes('violation') || payload.violation === true) {
        violations++
      }
    }
  }

  if (trustEvents === 0) {
    return 0 // No trust domain events yet
  }

  return violations / trustEvents
}

/**
 * Extract LLM event metrics from events.
 */
function extractLLMMetrics(events: SimCityEventEnvelope[]): {
  expectedRejectionRate: number
  unexpectedErrorRate: number
  invariantViolationRate: number
  silentFailureRate: number
} {
  let totalLLMEvents = 0
  let expectedRejections = 0
  let unexpectedErrors = 0
  let invariantViolations = 0
  let silentFailures = 0

  for (const envelope of events) {
    const { domain, type, payload } = envelope.event

    if (domain === 'llm' && type === 'event.processed') {
      totalLLMEvents++

      // Check classification (EXPECTED_REJECTION means it was classified as edge/impossible)
      if (payload.classification === 'EXPECTED_REJECTION' && payload.execution_rejected === true) {
        expectedRejections++
      }

      // Unexpected errors: execution failed but wasn't rejected cleanly
      if (payload.execution_success === false && payload.execution_rejected === false) {
        unexpectedErrors++
      }

      // Invariant violations
      if (payload.invariant_status === 'violated') {
        invariantViolations++
      }

      // Silent failures: success=true but invariant violated (should never happen)
      if (payload.execution_success === true && payload.invariant_status === 'violated') {
        silentFailures++
      }
    }
  }

  if (totalLLMEvents === 0) {
    return {
      expectedRejectionRate: 0,
      unexpectedErrorRate: 0,
      invariantViolationRate: 0,
      silentFailureRate: 0,
    }
  }

  return {
    expectedRejectionRate: expectedRejections / totalLLMEvents,
    unexpectedErrorRate: unexpectedErrors / totalLLMEvents,
    invariantViolationRate: invariantViolations / totalLLMEvents,
    silentFailureRate: silentFailures / totalLLMEvents,
  }
}

/**
 * Compute all metrics from an event stream.
 * Returns a record with all metric IDs and their computed values.
 * Missing signals return explicit defaults (0 or neutral values).
 */
export function computeMetricsFromEvents(
  events: SimCityEventEnvelope[]
): Record<MetricId, number> {
  const metrics: Partial<Record<MetricId, number>> = {}

  // Extract latencies and compute p95
  const latencies = extractLatencies(events)
  metrics['latency.p95'] = computeP95(latencies)

  // Count errors
  const errorCount = countErrors(events)
  const totalEvents = events.length
  metrics['error.rate'] = totalEvents > 0 ? errorCount / totalEvents : 0

  // Extract capacity utilization
  metrics['capacity.utilization'] = extractCapacityUtilization(events)

  // Extract booking metrics
  const bookingMetrics = extractBookingMetrics(events)
  metrics['booking.success_rate'] = bookingMetrics.successRate
  metrics['booking.drop_rate'] = bookingMetrics.dropRate

  // Extract trust violation rate
  metrics['trust.violation_rate'] = extractTrustViolationRate(events)

  // Extract LLM event metrics
  const llmMetrics = extractLLMMetrics(events)
  metrics['llm.expected_rejection_rate'] = llmMetrics.expectedRejectionRate
  metrics['llm.unexpected_error_rate'] = llmMetrics.unexpectedErrorRate
  metrics['llm.invariant_violation_rate'] = llmMetrics.invariantViolationRate
  metrics['llm.silent_failure_rate'] = llmMetrics.silentFailureRate

  // Ensure all metrics are present (fill missing with 0)
  const allMetrics: Record<MetricId, number> = {
    'booking.success_rate': metrics['booking.success_rate'] ?? 0,
    'booking.drop_rate': metrics['booking.drop_rate'] ?? 0,
    'capacity.utilization': metrics['capacity.utilization'] ?? 0,
    'trust.violation_rate': metrics['trust.violation_rate'] ?? 0,
    'latency.p95': metrics['latency.p95'] ?? 0,
    'error.rate': metrics['error.rate'] ?? 0,
    'llm.expected_rejection_rate': metrics['llm.expected_rejection_rate'] ?? 0,
    'llm.unexpected_error_rate': metrics['llm.unexpected_error_rate'] ?? 0,
    'llm.invariant_violation_rate': metrics['llm.invariant_violation_rate'] ?? 0,
    'llm.silent_failure_rate': metrics['llm.silent_failure_rate'] ?? 0,
  }

  return allMetrics
}




















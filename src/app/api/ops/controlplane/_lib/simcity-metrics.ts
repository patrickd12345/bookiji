/**
 * SimCity Phase 6: Canonical Metrics Registry
 *
 * Defines all available metrics with their metadata.
 * This registry is the single source of truth for metric definitions.
 */

import type { MetricDefinition, MetricId } from './simcity-types'

export const METRICS_REGISTRY: Record<MetricId, MetricDefinition> = {
  'booking.success_rate': {
    id: 'booking.success_rate',
    domain: 'booking',
    description: 'Percentage of booking requests that complete successfully',
    unit: 'ratio',
    direction: 'higher-is-better',
  },
  'booking.drop_rate': {
    id: 'booking.drop_rate',
    domain: 'booking',
    description: 'Percentage of booking requests that are dropped/rejected',
    unit: 'ratio',
    direction: 'lower-is-better',
  },
  'capacity.utilization': {
    id: 'capacity.utilization',
    domain: 'capacity',
    description: 'Current capacity utilization as a ratio (0-1)',
    unit: 'ratio',
    direction: 'lower-is-better',
  },
  'trust.violation_rate': {
    id: 'trust.violation_rate',
    domain: 'trust',
    description: 'Rate of trust/safety violations detected',
    unit: 'ratio',
    direction: 'lower-is-better',
  },
  'latency.p95': {
    id: 'latency.p95',
    domain: 'performance',
    description: '95th percentile latency in milliseconds',
    unit: 'ms',
    direction: 'lower-is-better',
  },
  'error.rate': {
    id: 'error.rate',
    domain: 'reliability',
    description: 'Rate of errors encountered (errors per total events)',
    unit: 'ratio',
    direction: 'lower-is-better',
  },
}

/**
 * Get all metric IDs in deterministic order.
 */
export function getAllMetricIds(): MetricId[] {
  return Object.keys(METRICS_REGISTRY) as MetricId[]
}

/**
 * Get metric definition by ID.
 */
export function getMetricDefinition(id: MetricId): MetricDefinition | undefined {
  return METRICS_REGISTRY[id]
}




















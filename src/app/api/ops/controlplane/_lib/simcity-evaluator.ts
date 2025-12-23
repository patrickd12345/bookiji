/**
 * SimCity Phase 6: Evaluator
 *
 * Computes metric deltas and evaluates dials to determine if a variant is allowed.
 * All functions are deterministic and pure.
 */

import { stableHash } from './simcity-hash'
import type {
  MetricDelta,
  DialStatus,
  DialDefinition,
  EvaluationResult,
  MetricId,
  SimCityEventEnvelope,
} from './simcity-types'
import { METRICS_REGISTRY } from './simcity-metrics'
import { computeMetricsFromEvents } from './simcity-metric-extractors'

/**
 * Compute metric deltas between base and variant metrics.
 */
export function computeMetricDeltas(
  baseMetrics: Record<MetricId, number>,
  variantMetrics: Record<MetricId, number>
): MetricDelta[] {
  const deltas: MetricDelta[] = []

  for (const metricId of Object.keys(METRICS_REGISTRY) as MetricId[]) {
    const base = baseMetrics[metricId] ?? 0
    const variant = variantMetrics[metricId] ?? 0
    const delta = variant - base

    const metric = METRICS_REGISTRY[metricId]
    let direction: 'improved' | 'degraded' | 'neutral'

    // Determine direction based on metric direction and delta
    if (Math.abs(delta) < 1e-9) {
      direction = 'neutral'
    } else if (metric.direction === 'higher-is-better') {
      direction = delta > 0 ? 'improved' : 'degraded'
    } else {
      // lower-is-better
      direction = delta < 0 ? 'improved' : 'degraded'
    }

    deltas.push({
      id: metricId,
      base,
      variant,
      delta,
      direction,
    })
  }

  // Sort deterministically by metric ID
  deltas.sort((a, b) => a.id.localeCompare(b.id))

  return deltas
}

/**
 * Evaluate dials against metrics and classify zones.
 */
export function evalDials(
  metrics: Record<MetricId, number>,
  dials: DialDefinition[]
): DialStatus[] {
  const statuses: DialStatus[] = []

  for (const dial of dials) {
    const value = metrics[dial.metric] ?? 0
    const metric = METRICS_REGISTRY[dial.metric]

    if (!metric) {
      // Skip dials for unknown metrics
      continue
    }

    let zone: 'green' | 'yellow' | 'red'

    const [greenMin, greenMax] = dial.green
    const [yellowMin, yellowMax] = dial.yellow
    const [redMin, redMax] = dial.red

    // Classify zone based on metric direction
    if (metric.direction === 'lower-is-better') {
      // Lower values are better: green is lowest range
      if (value >= greenMin && value <= greenMax) {
        zone = 'green'
      } else if (value >= yellowMin && value <= yellowMax) {
        zone = 'yellow'
      } else {
        zone = 'red'
      }
    } else {
      // Higher values are better: green is highest range
      if (value >= greenMin && value <= greenMax) {
        zone = 'green'
      } else if (value >= yellowMin && value <= yellowMax) {
        zone = 'yellow'
      } else {
        zone = 'red'
      }
    }

    statuses.push({
      metric: dial.metric,
      value,
      zone,
    })
  }

  // Sort deterministically by metric ID
  statuses.sort((a, b) => a.metric.localeCompare(b.metric))

  return statuses
}

/**
 * Generate deterministic summary string.
 */
function generateSummary(
  dialStatuses: DialStatus[],
  deltas?: MetricDelta[]
): string {
  const redCount = dialStatuses.filter((s) => s.zone === 'red').length
  const yellowCount = dialStatuses.filter((s) => s.zone === 'yellow').length
  const greenCount = dialStatuses.filter((s) => s.zone === 'green').length

  const parts: string[] = []

  parts.push(`Status: ${redCount} red, ${yellowCount} yellow, ${greenCount} green`)

  // Add top 3 worst red/yellow by magnitude
  const worst = [...dialStatuses]
    .filter((s) => s.zone === 'red' || s.zone === 'yellow')
    .sort((a, b) => {
      // Sort by zone (red first) then by value magnitude
      if (a.zone !== b.zone) {
        return a.zone === 'red' ? -1 : 1
      }
      return Math.abs(b.value) - Math.abs(a.value)
    })
    .slice(0, 3)

  if (worst.length > 0) {
    parts.push('Top issues:')
    for (const status of worst) {
      const metric = METRICS_REGISTRY[status.metric]
      parts.push(`  ${status.metric}: ${status.value.toFixed(3)} ${metric.unit} (${status.zone})`)
    }
  }

  // Add top deltas if provided
  if (deltas && deltas.length > 0) {
    const topDeltas = [...deltas]
      .filter((d) => d.direction !== 'neutral')
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3)

    if (topDeltas.length > 0) {
      parts.push('Top changes:')
      for (const delta of topDeltas) {
        const sign = delta.delta > 0 ? '+' : ''
        parts.push(`  ${delta.id}: ${sign}${delta.delta.toFixed(3)} (${delta.direction})`)
      }
    }
  }

  return parts.join('\n')
}

/**
 * Evaluate a replay variant against dials.
 */
export function evaluateReplayVariant({
  reportHash,
  baseEvents,
  variantEvents,
  dials,
  variantId,
}: {
  reportHash: string
  baseEvents: SimCityEventEnvelope[]
  variantEvents: SimCityEventEnvelope[]
  dials: DialDefinition[]
  variantId?: string
}): EvaluationResult {
  // Compute metrics
  const baseMetrics = computeMetricsFromEvents(baseEvents)
  const variantMetrics = computeMetricsFromEvents(variantEvents)

  // Evaluate dials for variant
  const dialStatuses = evalDials(variantMetrics, dials)

  // Compute deltas if variant is not base
  const deltas = variantId && variantId !== 'base' ? computeMetricDeltas(baseMetrics, variantMetrics) : undefined

  // Determine allowed status
  const violated = dialStatuses.filter((s) => s.zone === 'red')
  const warnings = dialStatuses.filter((s) => s.zone === 'yellow')
  const allowed = violated.length === 0

  // Generate summary
  const summary = generateSummary(dialStatuses, deltas)

  return {
    allowed,
    violated,
    warnings,
    summary,
    reportHash,
    variantId,
  }
}











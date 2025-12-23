/**
 * SimCity Phase 6: Default Dial Definitions
 *
 * Dials define thresholds (green/yellow/red zones) for metrics.
 * These are reasonable defaults and should be configurable in the future.
 *
 * Rules:
 * - Ranges must be non-overlapping
 * - Ranges must cover the plausible space (0-1 for ratios, 0+ for ms)
 * - Green/yellow/red are ordered: green < yellow < red (or reverse for lower-is-better)
 */

import type { DialDefinition, MetricId } from './simcity-types'
import { METRICS_REGISTRY } from './simcity-metrics'

export const DEFAULT_DIALS: DialDefinition[] = [
  {
    metric: 'booking.success_rate',
    green: [0.95, 1.0],
    yellow: [0.90, 0.95],
    red: [0.0, 0.90],
  },
  {
    metric: 'booking.drop_rate',
    green: [0.0, 0.02],
    yellow: [0.02, 0.05],
    red: [0.05, 1.0],
  },
  {
    metric: 'capacity.utilization',
    green: [0.0, 0.7],
    yellow: [0.7, 0.85],
    red: [0.85, 1.0],
  },
  {
    metric: 'trust.violation_rate',
    green: [0.0, 0.001],
    yellow: [0.001, 0.01],
    red: [0.01, 1.0],
  },
  {
    metric: 'latency.p95',
    green: [0, 300],
    yellow: [300, 800],
    red: [800, Number.MAX_SAFE_INTEGER],
  },
  {
    metric: 'error.rate',
    green: [0.0, 0.01],
    yellow: [0.01, 0.03],
    red: [0.03, 1.0],
  },
]

/**
 * Validate that dial ranges are non-overlapping and cover the space.
 */
export function validateDial(dial: DialDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const metric = METRICS_REGISTRY[dial.metric]

  if (!metric) {
    errors.push(`Metric ${dial.metric} not found in registry`)
    return { valid: false, errors }
  }

  const [greenMin, greenMax] = dial.green
  const [yellowMin, yellowMax] = dial.yellow
  const [redMin, redMax] = dial.red

  // Check ordering (for lower-is-better, zones are reversed)
  if (metric.direction === 'lower-is-better') {
    // Green should be lowest, red highest
    if (greenMax > yellowMin) {
      errors.push('Green and yellow ranges overlap')
    }
    if (yellowMax > redMin) {
      errors.push('Yellow and red ranges overlap')
    }
    if (greenMin < 0) {
      errors.push('Green range extends below 0')
    }
  } else {
    // higher-is-better: green should be highest, red lowest
    if (greenMin < yellowMax) {
      errors.push('Green and yellow ranges overlap')
    }
    if (yellowMin < redMax) {
      errors.push('Yellow and red ranges overlap')
    }
    if (greenMax > 1 && dial.metric.includes('rate')) {
      // Ratios shouldn't exceed 1
      if (greenMax > 1.01) {
        errors.push('Green range extends above 1 for ratio metric')
      }
    }
  }

  // Check that ranges are valid (min <= max)
  if (greenMin > greenMax || yellowMin > yellowMax || redMin > redMax) {
    errors.push('Range min > max')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate all default dials.
 */
export function validateAllDials(): { valid: boolean; errors: Array<{ dial: MetricId; errors: string[] }> } {
  const allErrors: Array<{ dial: MetricId; errors: string[] }> = []

  for (const dial of DEFAULT_DIALS) {
    const result = validateDial(dial)
    if (!result.valid) {
      allErrors.push({ dial: dial.metric, errors: result.errors })
    }
  }

  return { valid: allErrors.length === 0, errors: allErrors }
}











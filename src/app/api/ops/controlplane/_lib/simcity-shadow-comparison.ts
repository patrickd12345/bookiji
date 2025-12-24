/**
 * SimCity Phase 10: Shadow Comparison
 *
 * Compares SimCity shadow simulation with actual production metrics.
 * Generates comparison report with hypothetical verdict.
 */

import { hashStableJson } from './simcity-governance-hash'
import { evaluateProposal } from './simcity-governance'
import type {
  ShadowComparisonReport,
  ShadowEvent,
  GovernanceVerdict,
  SimCityProposal,
  GovernanceContext,
} from './simcity-types'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DEFAULT_DIALS } from './simcity-dials'
import { simulateShadow } from './simcity-shadow-simulate'

/**
 * Generate shadow comparison report.
 * 
 * Compares:
 * - SimCity simulated metrics (from shadow events)
 * - Production actual metrics (from production data source)
 * 
 * Computes hypothetical verdict based on SimCity simulation.
 * 
 * @param window Time window for comparison
 * @param shadowEvents Events collected from production
 * @param prodMetrics Actual production metrics
 * @returns Shadow comparison report
 */
export function generateShadowComparisonReport(
  window: string,
  shadowEvents: ShadowEvent[],
  prodMetrics: Record<string, number>
): ShadowComparisonReport {
  // Simulate shadow events
  const { simulatedMetrics, simulatedDials } = simulateShadow(shadowEvents)

  // Build a dummy proposal for hypothetical verdict evaluation
  // The verdict will be based on the simulated dials, not on a real proposal
  const dummyProposal: SimCityProposal = {
    id: 'shadow-dummy',
    tick: 0,
    domain: 'shadow',
    action: 'shadow-comparison',
    description: 'Shadow mode comparison',
    confidence: 1.0,
    evidenceEventIds: [],
    source: 'rules',
  }

  // Evaluate hypothetical verdict based on simulated dials
  const ctx: GovernanceContext = {
    tick: 0,
    proposal: dummyProposal,
    dialsSnapshot: simulatedDials,
  }

  const hypotheticalDecision = evaluateProposal(ctx)
  const hypotheticalVerdict: GovernanceVerdict = hypotheticalDecision.verdict

  // Compute deltas between SimCity and production
  const deltas: Array<{
    metric: string
    simcityValue: number
    prodValue: number
    delta: number
  }> = []

  // Compare metrics (using keys from both sources)
  const allMetricKeys = new Set([
    ...Object.keys(simulatedMetrics),
    ...Object.keys(prodMetrics),
  ])

  for (const metric of allMetricKeys) {
    const simcityValue = simulatedMetrics[metric as keyof typeof simulatedMetrics] ?? 0
    const prodValue = prodMetrics[metric] ?? 0
    const delta = simcityValue - prodValue

    deltas.push({
      metric,
      simcityValue,
      prodValue,
      delta,
    })
  }

  // Sort deltas by metric name for determinism
  deltas.sort((a, b) => a.metric.localeCompare(b.metric))

  // Identify divergence flags
  const divergenceFlags: string[] = []
  
  // Flag significant divergences (threshold: 10% difference)
  for (const delta of deltas) {
    const threshold = Math.abs(delta.prodValue) * 0.1
    if (Math.abs(delta.delta) > threshold && Math.abs(delta.delta) > 0.01) {
      divergenceFlags.push(
        `${delta.metric}: ${delta.delta > 0 ? '+' : ''}${delta.delta.toFixed(3)} difference`
      )
    }
  }

  // Build report (without reportHash for hashing)
  const reportWithoutHash: Omit<ShadowComparisonReport, 'reportHash'> = {
    window,
    simcityMetrics: simulatedMetrics,
    prodMetrics,
    deltas,
    hypotheticalVerdict,
    divergenceFlags,
  }

  // Compute report hash
  const reportHash = hashStableJson(reportWithoutHash)

  return {
    ...reportWithoutHash,
    reportHash,
  }
}


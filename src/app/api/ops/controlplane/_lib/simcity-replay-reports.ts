/**
 * SimCity Phase 5: Replay Diff Report Generator
 *
 * Generates deterministic diff reports comparing baseline vs variant replays.
 */

import { stableHash } from './simcity-hash'
import type {
  SimCityReplayDiff,
  SimCityReplayMetricDelta,
  SimCityReplayReport,
  SimCityReplayVariant,
} from './simcity-types'

function stableStringify(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    // Type assertion to ensure TypeScript understands this is a record
    const obj: Record<string, unknown> = value as Record<string, unknown>
    const entries = Object.entries(obj)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/**
 * Compute event diffs between baseline and variant.
 */
function computeEventDiffs(
  baseline: SimCityReplayVariant,
  variant: SimCityReplayVariant
): SimCityReplayDiff[] {
  const diffs: SimCityReplayDiff[] = []
  const allDomains = new Set([
    ...Object.keys(baseline.summary.eventsByDomain),
    ...Object.keys(variant.summary.eventsByDomain),
  ])
  const allTypes = new Set([
    ...Object.keys(baseline.summary.eventsByType),
    ...Object.keys(variant.summary.eventsByType),
  ])

  for (const domain of allDomains) {
    for (const type of allTypes) {
      const baselineCount =
        baseline.events.filter((e) => e.event.domain === domain && e.event.type === type).length
      const variantCount =
        variant.events.filter((e) => e.event.domain === domain && e.event.type === type).length

      if (baselineCount !== variantCount) {
        diffs.push({
          domain,
          eventType: type,
          baselineCount,
          variantCount,
          delta: variantCount - baselineCount,
        })
      }
    }
  }

  // Sort deterministically
  diffs.sort((a, b) => {
    if (a.domain !== b.domain) return a.domain.localeCompare(b.domain)
    if (a.eventType !== b.eventType) return a.eventType.localeCompare(b.eventType)
    return 0
  })

  return diffs
}

/**
 * Extract numeric metrics from metricsByTick.
 */
function extractNumericMetrics(
  metricsByTick: Record<number, Record<string, unknown>>
): Record<string, number> {
  const result: Record<string, number> = {}

  for (const [tickStr, domainMetrics] of Object.entries(metricsByTick)) {
    const tick = Number(tickStr)
    if (!Number.isFinite(tick)) continue

    for (const [domain, metrics] of Object.entries(domainMetrics)) {
      if (typeof metrics !== 'object' || metrics === null) continue

      for (const [key, value] of Object.entries(metrics)) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          const metricKey = `${domain}.${key}`
          // Use last value for each metric (or average if needed, but last is simpler)
          result[metricKey] = value
        }
      }
    }
  }

  return result
}

/**
 * Compute metric deltas between baseline and variant.
 */
function computeMetricDeltas(
  baseline: SimCityReplayVariant,
  variant: SimCityReplayVariant
): SimCityReplayMetricDelta[] {
  const baselineMetrics = extractNumericMetrics(baseline.metricsByTick)
  const variantMetrics = extractNumericMetrics(variant.metricsByTick)

  const allMetrics = new Set([
    ...Object.keys(baselineMetrics),
    ...Object.keys(variantMetrics),
  ])

  const deltas: SimCityReplayMetricDelta[] = []

  for (const metric of allMetrics) {
    const baselineValue = baselineMetrics[metric] ?? null
    const variantValue = variantMetrics[metric] ?? null

    if (baselineValue !== variantValue) {
      const delta =
        baselineValue !== null && variantValue !== null ? variantValue - baselineValue : null

      deltas.push({
        metric,
        baselineValue,
        variantValue,
        delta,
      })
    }
  }

  // Sort deterministically
  deltas.sort((a, b) => a.metric.localeCompare(b.metric))

  return deltas
}

/**
 * Generate markdown summary of the diff report.
 */
function generateMarkdownSummary(
  report: Omit<SimCityReplayReport, 'markdownSummary' | 'reportHash'>
): string {
  const lines: string[] = []

  lines.push(`# SimCity Replay Report`)
  lines.push(``)
  lines.push(`- **Run ID**: ${report.runId}`)
  lines.push(`- **Seed**: ${report.seed}`)
  lines.push(`- **Tick Range**: ${report.fromTick} → ${report.toTick}`)
  lines.push(`- **Baseline Events**: ${report.baselineSummary.totalEvents}`)
  lines.push(``)

  // Variant summaries
  for (const variant of report.variantSummaries) {
    lines.push(`## Variant: ${variant.name}`)
    lines.push(`- **Total Events**: ${variant.totalEvents}`)
    lines.push(`- **Delta**: ${variant.totalEvents - report.baselineSummary.totalEvents}`)
    lines.push(``)
  }

  // Diffs
  for (const diff of report.diffs) {
    if (diff.eventDiffs.length === 0 && diff.metricDeltas.length === 0) {
      continue
    }

    lines.push(`### ${diff.variantName} - Differences`)
    lines.push(``)

    if (diff.eventDiffs.length > 0) {
      lines.push(`#### Event Diffs`)
      lines.push(``)
      lines.push(`| Domain | Type | Baseline | Variant | Delta |`)
      lines.push(`|--------|------|----------|---------|-------|`)

      // Show top 10 by absolute delta
      const topDiffs = [...diff.eventDiffs]
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 10)

      for (const eventDiff of topDiffs) {
        lines.push(
          `| ${eventDiff.domain} | ${eventDiff.eventType} | ${eventDiff.baselineCount} | ${eventDiff.variantCount} | ${eventDiff.delta > 0 ? '+' : ''}${eventDiff.delta} |`
        )
      }

      if (diff.eventDiffs.length > 10) {
        lines.push(`\n_... and ${diff.eventDiffs.length - 10} more event differences_`)
      }
      lines.push(``)
    }

    if (diff.metricDeltas.length > 0) {
      lines.push(`#### Metric Deltas`)
      lines.push(``)
      lines.push(`| Metric | Baseline | Variant | Delta |`)
      lines.push(`|--------|----------|---------|-------|`)

      for (const metricDelta of diff.metricDeltas) {
        const baselineStr = metricDelta.baselineValue?.toFixed(2) ?? 'N/A'
        const variantStr = metricDelta.variantValue?.toFixed(2) ?? 'N/A'
        const deltaStr =
          metricDelta.delta !== null
            ? `${metricDelta.delta > 0 ? '+' : ''}${metricDelta.delta.toFixed(2)}`
            : 'N/A'

        lines.push(`| ${metricDelta.metric} | ${baselineStr} | ${variantStr} | ${deltaStr} |`)
      }
      lines.push(``)
    }
  }

  return lines.join('\n')
}

/**
 * Generate a complete replay diff report.
 */
export function generateReplayReport(
  runId: string,
  seed: number,
  fromTick: number,
  toTick: number,
  baseline: SimCityReplayVariant,
  variants: SimCityReplayVariant[]
): SimCityReplayReport {
  // Build baseline summary
  const baselineSummary = {
    totalEvents: baseline.summary.totalEvents,
    eventsByDomain: { ...baseline.summary.eventsByDomain },
    eventsByType: { ...baseline.summary.eventsByType },
    metrics: extractNumericMetrics(baseline.metricsByTick),
  }

  // Build variant summaries
  const variantSummaries = variants.map((variant) => ({
    name: variant.name,
    totalEvents: variant.summary.totalEvents,
    eventsByDomain: { ...variant.summary.eventsByDomain },
    eventsByType: { ...variant.summary.eventsByType },
    metrics: extractNumericMetrics(variant.metricsByTick),
  }))

  // Compute diffs
  const diffs = variants.map((variant) => ({
    variantName: variant.name,
    eventDiffs: computeEventDiffs(baseline, variant),
    metricDeltas: computeMetricDeltas(baseline, variant),
  }))

  // Build report (without markdown and hash first)
  const reportWithoutMetadata: Omit<SimCityReplayReport, 'markdownSummary' | 'reportHash' | 'generatedAt' | 'runId'> = {
    seed,
    fromTick,
    toTick,
    baselineSummary,
    variantSummaries,
    diffs,
  }

  const generatedAt = new Date().toISOString()

  // Generate markdown
  const markdownSummary = generateMarkdownSummary({ ...reportWithoutMetadata, generatedAt, runId })

  // Compute deterministic hash (exclude runId and generatedAt for stability)
  const reportJson = stableStringify(reportWithoutMetadata)
  const reportHash = stableHash(reportJson)

  return {
    ...reportWithoutMetadata,
    markdownSummary,
    reportHash,
    generatedAt,
    runId,
  }
}




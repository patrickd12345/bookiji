import { NextRequest, NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '../../_lib/simcity'
import { simCityStatus, simCityGetProposals, simCityCursor } from '../../_lib/simcity'
import { getReplay } from '../../_lib/simcity-replay-store'
import { DEFAULT_DIALS } from '../../_lib/simcity-dials'
import { evaluateReplayVariant, computeMetricDeltas, evalDials } from '../../_lib/simcity-evaluator'
import { computeMetricsFromEvents } from '../../_lib/simcity-metric-extractors'
import { evaluateAllProposals } from '../../_lib/simcity-governance'
import type { DialStatus, EvaluationResult, MetricDelta } from '../../_lib/simcity-types'

/**
 * GET /api/ops/controlplane/simcity/governance
 *
 * Evaluates all current proposals using governance rules.
 * Query params:
 * - variantRunId (optional): replay run ID to include in evaluation context
 * - variantId (optional): which variant to compare (default: first variant)
 *
 * Read-only, guarded by SimCity allowlist.
 */
export async function GET(request: NextRequest) {
  try {
    ensureSimCityAllowed()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SimCity is not allowed'
    return NextResponse.json({ error: message }, { status: 403 })
  }

  try {
    const status = simCityStatus()
    const cursor = simCityCursor()

    if (!status.running) {
      return NextResponse.json({ error: 'SimCity is not running' }, { status: 400 })
    }

    // Get proposals
    const proposals = simCityGetProposals()

    // If no proposals, return empty decisions
    if (proposals.length === 0) {
      return NextResponse.json({
        success: true,
        tick: status.tick,
        decisions: [],
      })
    }

    // Get dials snapshot from live engine
    const metrics = computeMetricsFromEvents(status.events)
    const dialsSnapshot: DialStatus[] = evalDials(metrics, DEFAULT_DIALS)

    // Get replay evaluation if variantRunId provided
    const searchParams = request.nextUrl.searchParams
    const variantRunId = searchParams.get('variantRunId')
    const variantId = searchParams.get('variantId') || undefined

    let replayEvaluation:
      | {
          base?: EvaluationResult
          variant?: EvaluationResult
          deltas?: MetricDelta[]
        }
      | undefined

    let replayReportSummary:
      | {
          reportHash: string
          markdownSummary?: string
          eventDiff?: Record<string, unknown>
        }
      | undefined

    if (variantRunId) {
      const replayEntry = getReplay(variantRunId)
      if (replayEntry && replayEntry.status === 'completed' && replayEntry.report) {
        const report = replayEntry.report
        const baseEvents = replayEntry.response.baseline?.events || []
        const selectedVariant = variantId
          ? replayEntry.response.variants.find((v) => v.name === variantId)
          : replayEntry.response.variants[0]

        if (selectedVariant) {
          const variantEvents = selectedVariant.events

          // Compute metrics and evaluation
          const baseMetrics = computeMetricsFromEvents(baseEvents)
          const variantMetrics = computeMetricsFromEvents(variantEvents)
          const deltas = computeMetricDeltas(baseMetrics, variantMetrics)

          const baseEvaluation = evaluateReplayVariant({
            reportHash: report.reportHash,
            baseEvents,
            variantEvents: baseEvents,
            dials: DEFAULT_DIALS,
            variantId: 'base',
          })

          const variantEvaluation = evaluateReplayVariant({
            reportHash: report.reportHash,
            baseEvents,
            variantEvents,
            dials: DEFAULT_DIALS,
            variantId: selectedVariant.name,
          })

          replayEvaluation = {
            base: baseEvaluation,
            variant: variantEvaluation,
            deltas,
          }

          replayReportSummary = {
            reportHash: report.reportHash,
            markdownSummary: report.markdownSummary,
          }
        }
      }
    }

    // Evaluate all proposals
    const decisions = evaluateAllProposals({
      tick: status.tick,
      proposals,
      dialsSnapshot,
      replayEvaluation,
      replayReportSummary,
    })

    return NextResponse.json({
      success: true,
      tick: status.tick,
      decisions,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to evaluate governance'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


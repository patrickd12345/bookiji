import { NextRequest, NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '@/app/api/ops/controlplane/_lib/simcity'
import { getReplay } from '@/app/api/ops/controlplane/_lib/simcity-replay-store'
import { DEFAULT_DIALS } from '@/app/api/ops/controlplane/_lib/simcity-dials'
import { evaluateReplayVariant, computeMetricDeltas, evalDials } from '@/app/api/ops/controlplane/_lib/simcity-evaluator'
import { computeMetricsFromEvents } from '@/app/api/ops/controlplane/_lib/simcity-metric-extractors'
import { stableHash } from '@/app/api/ops/controlplane/_lib/simcity-hash'
import type { MetricDelta, EvaluationResult } from '@/app/api/ops/controlplane/_lib/simcity-types'

/**
 * GET /api/ops/controlplane/simcity/replay/[runId]/evaluation?variant=base|<variantId>
 *
 * Evaluates a replay variant against dials and returns metrics, deltas, and evaluation result.
 * Read-only, guarded by SimCity allowlist.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    ensureSimCityAllowed()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SimCity is not allowed'
    return NextResponse.json({ error: message }, { status: 403 })
  }

  try {
    const { runId } = await params
    const entry = getReplay(runId)

    if (!entry) {
      return NextResponse.json({ error: `Replay ${runId} not found` }, { status: 404 })
    }

    if (entry.status !== 'completed') {
      return NextResponse.json(
        { error: `Replay ${runId} is not completed (status: ${entry.status})` },
        { status: 400 }
      )
    }

    // Get variant from query param
    const searchParams = request.nextUrl.searchParams
    const variantParam = searchParams.get('variant') || 'base'

    // Get base events
    const baseEvents = entry.response.baseline?.events || []

    // Get variant events
    let variantEvents: typeof baseEvents
    let variantId: string

    if (variantParam === 'base') {
      variantEvents = baseEvents
      variantId = 'base'
    } else {
      const variant = entry.response.variants.find((v) => v.name === variantParam)
      if (!variant) {
        return NextResponse.json(
          { error: `Variant "${variantParam}" not found in replay ${runId}` },
          { status: 400 }
        )
      }
      variantEvents = variant.events
      variantId = variantParam
    }

    // Compute metrics
    const baseMetrics = computeMetricsFromEvents(baseEvents)
    const variantMetrics = computeMetricsFromEvents(variantEvents)

    // Evaluate dials
    const evaluation = evaluateReplayVariant({
      reportHash: entry.report?.reportHash || stableHash(JSON.stringify({ runId, variantId })),
      baseEvents,
      variantEvents,
      dials: DEFAULT_DIALS,
      variantId,
    })

    // Compute deltas if not base
    const deltas: MetricDelta[] | undefined =
      variantId !== 'base' ? computeMetricDeltas(baseMetrics, variantMetrics) : undefined

    // Get all dial statuses
    const dialStatuses = evalDials(variantMetrics, DEFAULT_DIALS)

    return NextResponse.json({
      success: true,
      reportHash: entry.report?.reportHash || '',
      variant: variantId,
      metrics: variantMetrics,
      deltas,
      dialStatuses,
      evaluation,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to evaluate replay variant'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


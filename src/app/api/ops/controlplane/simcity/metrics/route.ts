import { NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '../../_lib/simcity'
import { METRICS_REGISTRY, getAllMetricIds } from '../../_lib/simcity-metrics'
import type { MetricDefinition } from '../../_lib/simcity-types'

/**
 * GET /api/ops/controlplane/simcity/metrics
 *
 * Returns all available metric definitions.
 * Read-only, guarded by SimCity allowlist.
 */
export async function GET() {
  try {
    ensureSimCityAllowed()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SimCity is not allowed'
    return NextResponse.json({ error: message }, { status: 403 })
  }

  try {
    const metricIds = getAllMetricIds()
    const metrics: MetricDefinition[] = metricIds.map((id) => METRICS_REGISTRY[id])

    return NextResponse.json({
      success: true,
      metrics,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch metrics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


import { NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '@/app/api/ops/controlplane/_lib/simcity'
import { simCityStatus } from '@/app/api/ops/controlplane/_lib/simcity'
import { DEFAULT_DIALS } from '@/app/api/ops/controlplane/_lib/simcity-dials'
import { computeMetricsFromEvents } from '@/app/api/ops/controlplane/_lib/simcity-metric-extractors'
import { evalDials } from '@/app/api/ops/controlplane/_lib/simcity-evaluator'
import type { DialStatus } from '@/app/api/ops/controlplane/_lib/simcity-types'

/**
 * GET /api/ops/controlplane/simcity/dials/snapshot
 *
 * Returns current metrics and dial statuses from the live SimCity event buffer.
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
    const status = simCityStatus()

    if (!status.running) {
      return NextResponse.json({ error: 'SimCity is not running' }, { status: 400 })
    }

    // Compute metrics from current event buffer
    const metrics = computeMetricsFromEvents(status.events)

    // Evaluate dials
    const dialStatuses: DialStatus[] = evalDials(metrics, DEFAULT_DIALS)

    return NextResponse.json({
      success: true,
      tick: status.tick,
      metrics,
      dialStatuses,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get dials snapshot'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


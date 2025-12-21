import { NextRequest, NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '@/app/api/ops/controlplane/_lib/simcity'
import { collectShadowEvents } from '@/app/api/ops/controlplane/_lib/simcity-shadow-collector'
import { generateShadowComparisonReport } from '@/app/api/ops/controlplane/_lib/simcity-shadow-comparison'

/**
 * GET /api/ops/controlplane/simcity/shadow?window=...
 *
 * Generates shadow comparison report.
 * Compares SimCity simulation of production events with actual production metrics.
 * 
 * Query params:
 * - window: Time window specification (e.g., "1h", "5m", ISO date range)
 * 
 * Read-only, guarded by SimCity allowlist.
 * No side effects: shadow mode never affects production.
 */
export async function GET(request: NextRequest) {
  try {
    ensureSimCityAllowed()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SimCity is not allowed'
    return NextResponse.json({ error: message }, { status: 403 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const window = searchParams.get('window') || '1h'

    // Phase 10: Collect shadow events (stub - returns empty for now)
    const shadowEvents = collectShadowEvents(window)

    // Phase 10: Get production metrics (stub - returns empty for now)
    // Future: Query actual production metrics API
    const prodMetrics: Record<string, number> = {}

    // Generate comparison report
    const report = generateShadowComparisonReport(window, shadowEvents, prodMetrics)

    return NextResponse.json({
      success: true,
      report,
      note: 'Shadow mode — no effect on production',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate shadow report'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


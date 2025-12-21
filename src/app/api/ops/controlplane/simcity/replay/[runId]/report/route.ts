import { NextRequest, NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '@/app/api/ops/controlplane/_lib/simcity'
import { getReplay } from '@/app/api/ops/controlplane/_lib/simcity-replay-store'

/**
 * GET /api/ops/controlplane/simcity/replay/[runId]/report
 *
 * Get the diff report for a completed replay run.
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

  if (!entry.report) {
    return NextResponse.json({ error: `Report not available for replay ${runId}` }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    report: entry.report,
  })
}




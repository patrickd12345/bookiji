import { NextRequest, NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '@/app/api/ops/controlplane/_lib/simcity'
import { getReplay } from '@/app/api/ops/controlplane/_lib/simcity-replay-store'

/**
 * GET /api/ops/controlplane/simcity/replay/[runId]/status
 *
 * Get the status of a replay run.
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

  return NextResponse.json({
    success: true,
    runId,
    status: entry.status,
    response: entry.response,
    error: entry.error,
  })
}




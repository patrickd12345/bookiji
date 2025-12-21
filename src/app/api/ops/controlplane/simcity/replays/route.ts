import { NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '../../_lib/simcity'
import { listReplays } from '../../_lib/simcity-replay-store'

/**
 * GET /api/ops/controlplane/simcity/replays
 *
 * Returns list of all stored replay runs.
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
    const replays = listReplays()

    return NextResponse.json({
      success: true,
      replays,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list replays'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


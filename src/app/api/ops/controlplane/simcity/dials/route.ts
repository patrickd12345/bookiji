import { NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '../../_lib/simcity'
import { DEFAULT_DIALS } from '../../_lib/simcity-dials'
import type { DialDefinition } from '../../_lib/simcity-types'

/**
 * GET /api/ops/controlplane/simcity/dials
 *
 * Returns all default dial definitions.
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
    return NextResponse.json({
      success: true,
      dials: DEFAULT_DIALS,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dials'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}











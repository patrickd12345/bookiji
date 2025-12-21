import { NextRequest, NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '@/app/api/ops/controlplane/_lib/simcity'
import { getOverridesByProposalId, getAllOverrides } from '@/app/api/ops/controlplane/_lib/simcity-overrides-store'

/**
 * GET /api/ops/controlplane/simcity/overrides?proposalId=...
 *
 * Returns override records.
 * Query params:
 * - proposalId (optional): filter by proposal ID
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
    const searchParams = request.nextUrl.searchParams
    const proposalId = searchParams.get('proposalId')

    if (proposalId) {
      const overrides = getOverridesByProposalId(proposalId)
      return NextResponse.json({
        success: true,
        overrides,
      })
    }

    // Return all overrides if no proposalId specified
    const overrides = getAllOverrides()
    return NextResponse.json({
      success: true,
      overrides,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get overrides'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


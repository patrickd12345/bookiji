import { NextRequest, NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '@/app/api/ops/controlplane/_lib/simcity'
import { simCityStatus, simCityGetProposals } from '@/app/api/ops/controlplane/_lib/simcity'
import { DEFAULT_DIALS } from '@/app/api/ops/controlplane/_lib/simcity-dials'
import { evalDials } from '@/app/api/ops/controlplane/_lib/simcity-evaluator'
import { computeMetricsFromEvents } from '@/app/api/ops/controlplane/_lib/simcity-metric-extractors'
import { evaluateProposal } from '@/app/api/ops/controlplane/_lib/simcity-governance'
import type { GovernanceContext } from '@/app/api/ops/controlplane/_lib/simcity-types'

/**
 * GET /api/ops/controlplane/simcity/governance/[proposalId]
 *
 * Returns governance decision for a single proposal.
 * Read-only, guarded by SimCity allowlist.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    ensureSimCityAllowed()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SimCity is not allowed'
    return NextResponse.json({ error: message }, { status: 403 })
  }

  try {
    const { proposalId } = await params
    const status = simCityStatus()

    if (!status.running) {
      return NextResponse.json({ error: 'SimCity is not running' }, { status: 400 })
    }

    // Get proposals
    const proposals = simCityGetProposals()
    const proposal = proposals.find((p) => p.id === proposalId)

    if (!proposal) {
      return NextResponse.json({ error: `Proposal ${proposalId} not found` }, { status: 404 })
    }

    // Get dials snapshot
    const metrics = computeMetricsFromEvents(status.events)
    const dialsSnapshot = evalDials(metrics, DEFAULT_DIALS)

    // Build context
    const ctx: GovernanceContext = {
      tick: status.tick,
      proposal,
      dialsSnapshot,
    }

    // Evaluate
    const decision = evaluateProposal(ctx)

    return NextResponse.json({
      success: true,
      decision,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to evaluate proposal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}




















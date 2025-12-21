import { NextResponse } from 'next/server'
import { simCityStatus, ensureSimCityAllowed } from '../../_lib/simcity'
import type { SimCityProposal } from '../../_lib/simcity-types'

/**
 * GET /api/ops/controlplane/simcity/proposals
 *
 * Returns all proposal.generated events from the current SimCity run.
 *
 * Guards:
 * - Denies DEPLOY_ENV=production
 * - Requires env allowlist (same as Phase 1-3)
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

    // Extract all proposal.generated events
    const proposalEvents = status.events.filter(
      (envelope) => envelope.event.type === 'proposal.generated'
    )

    // Convert events to proposal objects
    const proposals: SimCityProposal[] = proposalEvents.map((envelope) => {
      const payload = envelope.event.payload as {
        proposalId: string
        domain: string
        action: string
        description: string
        confidence: number
        evidenceEventIds: string[]
        source: 'llm' | 'rules'
      }

      return {
        id: payload.proposalId,
        tick: envelope.event.tick,
        domain: payload.domain,
        action: payload.action,
        description: payload.description,
        confidence: payload.confidence,
        evidenceEventIds: payload.evidenceEventIds,
        source: payload.source,
      }
    })

    // Get proposal mode from config
    const mode = status.config?.proposals?.mode ?? 'off'

    return NextResponse.json({
      success: true,
      mode,
      tick: status.tick,
      proposals,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read SimCity proposals'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


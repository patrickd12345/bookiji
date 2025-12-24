import { NextRequest, NextResponse } from 'next/server'
import { ensureSimCityAllowed } from '@/app/api/ops/controlplane/_lib/simcity'
import { simCityStatus, simCityGetProposals } from '@/app/api/ops/controlplane/_lib/simcity'
import { DEFAULT_DIALS } from '@/app/api/ops/controlplane/_lib/simcity-dials'
import { evalDials } from '@/app/api/ops/controlplane/_lib/simcity-evaluator'
import { computeMetricsFromEvents } from '@/app/api/ops/controlplane/_lib/simcity-metric-extractors'
import { evaluateProposal } from '@/app/api/ops/controlplane/_lib/simcity-governance'
import { hashOverrideRecord } from '@/app/api/ops/controlplane/_lib/simcity-governance-hash'
import { validateOverride, convertToOverrideVerdict } from '@/app/api/ops/controlplane/_lib/simcity-overrides'
import { appendOverride } from '@/app/api/ops/controlplane/_lib/simcity-overrides-store'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { GovernanceContext, OverrideRecord, OverrideVerdict } from '@/app/api/ops/controlplane/_lib/simcity-types'
import { randomUUID } from 'node:crypto'

/**
 * POST /api/ops/controlplane/simcity/override
 *
 * Creates a human override record.
 * Append-only: never modifies existing decisions.
 * Read-only, guarded by SimCity allowlist.
 */
export async function POST(request: NextRequest) {
  try {
    ensureSimCityAllowed()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SimCity is not allowed'
    return NextResponse.json({ error: message }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { proposalId, decisionHash, verdictAfter, justification, actor } = body

    // Validate required fields
    if (!proposalId || !decisionHash || !verdictAfter || !justification || !actor) {
      return NextResponse.json(
        { error: 'Missing required fields: proposalId, decisionHash, verdictAfter, justification, actor' },
        { status: 400 }
      )
    }

    // Validate actor structure
    if (!actor.userId || !actor.role) {
      return NextResponse.json(
        { error: 'Actor must have userId and role' },
        { status: 400 }
      )
    }

    const status = simCityStatus()

    if (!status.running) {
      return NextResponse.json({ error: 'SimCity is not running' }, { status: 400 })
    }

    // Get proposal
    const proposals = simCityGetProposals()
    const proposal = proposals.find((p) => p.id === proposalId)

    if (!proposal) {
      return NextResponse.json({ error: `Proposal ${proposalId} not found` }, { status: 404 })
    }

    // Load decision (re-evaluate to get current decision)
    const metrics = computeMetricsFromEvents(status.events)
    const dialsSnapshot = evalDials(metrics, DEFAULT_DIALS)

    const ctx: GovernanceContext = {
      tick: status.tick,
      proposal,
      dialsSnapshot,
    }

    const decision = evaluateProposal(ctx)

    // Validate decisionHash matches
    if (decisionHash !== decision.decisionHash) {
      return NextResponse.json(
        { error: 'DECISION_HASH_MISMATCH', message: 'Decision hash does not match current decision' },
        { status: 400 }
      )
    }

    // Validate override
    try {
      validateOverride({
        proposal,
        decision,
        override: {
          proposalId,
          decisionHash,
          verdictAfter: convertToOverrideVerdict(verdictAfter),
          justification,
          actor,
        },
      })
    } catch (validationError) {
      const message = validationError instanceof Error ? validationError.message : 'Validation failed'
      return NextResponse.json(
        { error: message, message: `Override validation failed: ${message}` },
        { status: 400 }
      )
    }

    // Build override record
    const overrideVerdictAfter = convertToOverrideVerdict(verdictAfter)
    const overrideVerdictBefore = convertToOverrideVerdict(decision.verdict.toUpperCase())

    const overrideRecord: Omit<OverrideRecord, 'overrideHash'> = {
      overrideId: randomUUID(),
      proposalId,
      decisionHash,
      verdictBefore: overrideVerdictBefore,
      verdictAfter: overrideVerdictAfter,
      actor,
      justification: justification.trim(),
      timestamp: new Date().toISOString(),
    }

    // Compute overrideHash
    const overrideHash = hashOverrideRecord(overrideRecord)

    // Append to store
    const completeRecord: OverrideRecord = {
      ...overrideRecord,
      overrideHash,
    }

    appendOverride(completeRecord)

    return NextResponse.json({
      success: true,
      override: completeRecord,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create override'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


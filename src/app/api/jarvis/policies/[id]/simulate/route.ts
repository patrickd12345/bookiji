/**
 * Jarvis Phase 5 - Policy Simulation API
 * 
 * Simulate incidents under a candidate policy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { simulateIncidents } from '@/lib/jarvis/simulation/engine'
import { getPolicyByUuid } from '@/lib/jarvis/policy/registry'

/**
 * POST /api/jarvis/policies/:id/simulate
 * Simulate incidents under a candidate policy
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check Phase 5 feature flag
    if (process.env.JARVIS_PHASE5_SIMULATION_ENABLED !== 'true') {
      return NextResponse.json(
        { error: 'Phase 5 simulation is not enabled' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { start, end } = body

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing required fields: start, end' },
        { status: 400 }
      )
    }

    const { id } = await params
    // Get policy UUID (id param might be policy_id or UUID)
    let policyUuid = id
    const policy = await getPolicyByUuid(id)
    if (!policy) {
      // Try as policy_id
      const { getPolicyById } = await import('@/lib/jarvis/policy/registry')
      const policyById = await getPolicyById(id)
      if (!policyById) {
        return NextResponse.json(
          { error: 'Policy not found' },
          { status: 404 }
        )
      }
      policyUuid = policyById.id
    } else {
      policyUuid = policy.id
    }

    const result = await simulateIncidents(
      { start, end },
      policyUuid
    )

    return NextResponse.json({ result })
  } catch (error) {
    console.error('[Jarvis] Error simulating policy:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Jarvis Phase 5 - Policy Approval API
 * 
 * Approve a policy change.
 */

import { NextRequest, NextResponse } from 'next/server'
import { approvePolicyChange } from '@/lib/jarvis/policy/workflow'

/**
 * POST /api/jarvis/policies/:id/approve
 * Approve a policy change
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin access (simplified)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { approved_by } = body

    if (!approved_by) {
      return NextResponse.json(
        { error: 'Missing required field: approved_by' },
        { status: 400 }
      )
    }

    const change = await approvePolicyChange(params.id, approved_by)

    return NextResponse.json({ change })
  } catch (error) {
    console.error('[Jarvis] Error approving policy change:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

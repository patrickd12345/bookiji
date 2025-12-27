/**
 * Jarvis Phase 5 - Policy Activation API
 * 
 * Activate an approved policy change.
 */

import { NextRequest, NextResponse } from 'next/server'
import { activatePolicyChange } from '@/lib/jarvis/policy/workflow'

/**
 * POST /api/jarvis/policies/:id/activate
 * Activate an approved policy change
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access (simplified)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { applied_by } = body

    if (!applied_by) {
      return NextResponse.json(
        { error: 'Missing required field: applied_by' },
        { status: 400 }
      )
    }

    const { id } = await params
    const result = await activatePolicyChange(id, applied_by)

    return NextResponse.json({ result })
  } catch (error) {
    console.error('[Jarvis] Error activating policy change:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

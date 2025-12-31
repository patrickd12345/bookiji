/**
 * Jarvis Phase 5 - Policy Management API
 * 
 * Endpoints for creating and managing policies.
 * Admin-only access.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPolicy, listPolicies, validatePolicyConfig } from '@/lib/jarvis/policy/registry'

/**
 * POST /api/jarvis/policies
 * Create a new policy (DRAFT status)
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access (simplified - implement proper auth)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { policy_id, name, version, policy_json, description } = body

    if (!policy_id || !name || !version || !policy_json) {
      return NextResponse.json(
        { error: 'Missing required fields: policy_id, name, version, policy_json' },
        { status: 400 }
      )
    }

    // Validate policy config
    const validationErrors = validatePolicyConfig(policy_json)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid policy config', details: validationErrors },
        { status: 400 }
      )
    }

    // Get user ID from auth (simplified)
    const userId = 'system' // TODO: Extract from JWT

    const policy = await createPolicy(policy_id, name, version, policy_json, userId, description)

    return NextResponse.json({ policy }, { status: 201 })
  } catch (error) {
    console.error('[Jarvis] Error creating policy:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/jarvis/policies
 * List policies
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | null

    const policies = await listPolicies(status || undefined)

    return NextResponse.json({ policies })
  } catch (error) {
    console.error('[Jarvis] Error listing policies:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

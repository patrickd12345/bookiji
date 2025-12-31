/**
 * Jarvis Phase 5 - Policy Suggestions API
 * 
 * Generate policy improvement suggestions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generatePolicySuggestions } from '@/lib/jarvis/suggestions/engine'

/**
 * POST /api/jarvis/policies/:id/suggestions
 * Generate suggestions for policy improvements
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: _id } = await params
    
    // Check Phase 5 feature flag
    if (process.env.JARVIS_PHASE5_SUGGESTIONS_ENABLED !== 'true') {
      return NextResponse.json(
        { error: 'Phase 5 suggestions are not enabled' },
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

    const suggestions = await generatePolicySuggestions({ start, end })

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('[Jarvis] Error generating suggestions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

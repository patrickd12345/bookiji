/**
 * Jarvis Incident Explain Endpoint
 * 
 * GET /api/jarvis/incidents/:id/explain
 * 
 * Returns timeline, explanations, and summary for an incident.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { explainDecision } from '@/lib/jarvis/observability/explain'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incidentId = params.id

    if (!incidentId) {
      return NextResponse.json(
        { error: 'Incident ID required' },
        { status: 400 }
      )
    }

    const supabase = getServerSupabase()

    // Get timeline from view
    const { data: timeline, error: timelineError } = await supabase
      .from('jarvis_incident_timeline')
      .select('*')
      .eq('incident_id', incidentId)
      .order('occurred_at', { ascending: true })

    if (timelineError) {
      console.error('[Jarvis] Error fetching timeline:', timelineError)
      return NextResponse.json(
        { error: 'Failed to fetch timeline' },
        { status: 500 }
      )
    }

    // Get summary if available
    const { data: summary, error: summaryError } = await supabase
      .from('jarvis_incident_summary')
      .select('*')
      .eq('incident_id', incidentId)
      .single()

    if (summaryError && summaryError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is OK if incident hasn't terminated yet
      console.error('[Jarvis] Error fetching summary:', summaryError)
    }

    // Build response with explanations
    const timelineWithExplanations = (timeline || []).map(event => {
      const explanation = event.event_type === 'escalation_decision_made' && event.trace
        ? explainDecision(event.trace as unknown as Parameters<typeof explainDecision>[0])
        : null

      return {
        ...event,
        explanation
      }
    })

    return NextResponse.json({
      incident_id: incidentId,
      timeline: timelineWithExplanations,
      summary: summary || null
    })
  } catch (error) {
    console.error('[Jarvis] Error in explain endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

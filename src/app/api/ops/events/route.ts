import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') || 'fused'
    const runId = searchParams.get('run_id')
    const providerId = searchParams.get('provider_id')
    const since = searchParams.get('since')
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    
    const supabase = createSupabaseServerClient()
    
    let query = supabase
      .from('ops_events')
      .select('*')
      .order('ts', { ascending: false })
      .limit(limit)

    if (source !== 'fused') {
      query = query.eq('source', source)
    }

    if (runId) {
      query = query.eq('run_id', runId)
    }

    if (providerId) {
      query = query.eq('provider_id', providerId)
    }

    if (since) {
      query = query.gte('ts', since)
    }
    
    const { data: events, error } = await query

    if (error) {
      throw error
    }
    
    return NextResponse.json({
      ok: true,
      data: events,
      count: events?.length || 0
    })
  } catch (error) {
    console.error('Error listing events:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to list events' },
      { status: 500 }
    )
  }
}

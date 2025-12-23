import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') || 'fused'
    const windowSeconds = parseInt(searchParams.get('window_seconds') || '900', 10)
    const providerId = searchParams.get('provider_id')
    
    const { data: metrics, error } = await supabase.rpc('get_ops_metrics', {
      p_source: source,
      p_window_seconds: windowSeconds,
      p_provider_id: providerId || null
    })

    if (error) {
      throw error
    }
    
    return NextResponse.json({
      ok: true,
      data: metrics
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}


import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url)
  const from = parseInt(searchParams.get('from') || '0')
  const limit = parseInt(searchParams.get('limit') || '50')
  const { id } = await context.params

  const { data, error } = await supabase
    .from('simcity_run_events')
    .select('*')
    .eq('run_id', id)
    .gte('event_index', from)
    .order('event_index', { ascending: true })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}


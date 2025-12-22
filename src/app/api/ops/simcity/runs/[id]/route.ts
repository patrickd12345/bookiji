import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const { data, error } = await supabase
    .from('simcity_runs')
    .select(`
      *,
      live:simcity_run_live(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}


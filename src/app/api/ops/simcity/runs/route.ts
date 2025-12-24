import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies'

export async function GET() {
  const { data, error } = await supabase
    .from('simcity_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}














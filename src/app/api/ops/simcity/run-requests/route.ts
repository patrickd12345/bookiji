import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies'

export async function GET() {
  const { data, error } = await supabase
    .from('simcity_run_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Format BigInt for JSON
  const formattedData = data.map(row => ({
    ...row,
    seed: row.seed ? row.seed.toString() : null
  }))

  return NextResponse.json(formattedData)
}













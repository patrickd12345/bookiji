import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { requested_by, tier, seed, concurrency, max_events, duration_seconds } = body

    // Validate inputs strictly
    if (!requested_by || typeof requested_by !== 'string') {
      return NextResponse.json({ error: 'requested_by is required' }, { status: 400 })
    }
    if (!tier || typeof tier !== 'string') {
      return NextResponse.json({ error: 'tier is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('simcity_run_requests')
      .insert({
        requested_by,
        tier,
        seed: seed ? BigInt(seed) : null,
        concurrency: concurrency || 1,
        max_events: max_events || 100,
        duration_seconds: duration_seconds || 60,
        status: 'PENDING'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Convert BigInt for JSON response if necessary
    const responseData = {
      ...data,
      seed: data.seed ? data.seed.toString() : null
    }

    return NextResponse.json(responseData)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}















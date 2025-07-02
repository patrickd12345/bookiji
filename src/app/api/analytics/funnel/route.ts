import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const funnel = searchParams.get('funnel') || 'booking'

  const supabase = createSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('conversion_funnels')
      .select('step_name')
      .eq('funnel_name', funnel)

    if (error) throw error

    // Aggregate counts in code
    const counts: Record<string, number> = {}
    data.forEach((row: any) => {
      counts[row.step_name] = (counts[row.step_name] || 0) + 1
    })

    const ordered = ['started', 'details', 'payment', 'completed']
    const result = ordered.map((name) => ({ step_name: name, count: counts[name] || 0 }))

    return NextResponse.json({ ok: true, data: result })
  } catch (err: any) {
    console.error('[analytics/funnel] error', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
} 
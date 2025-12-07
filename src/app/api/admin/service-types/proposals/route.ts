import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseClient'

export async function GET(req: NextRequest) {
  const supabase = getServerSupabase()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  try {
    let q = supabase
      .from('service_type_proposals')
      .select('id,label,vendor_id,business_name,email,phone,status,created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (status !== 'all') q = q.eq('status', status)

    const { data, error } = await q
    if (error) throw error

    return NextResponse.json({ ok: true, data })
  } catch (err: unknown) {
    console.error('[admin/service-types/proposals] error', err)
    const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

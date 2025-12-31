import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST(request: Request, context: { params: Promise<Record<string, string>> }) {
  const { id: bookingId } = await context.params

  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  if (process.env.E2E !== 'true') return NextResponse.json({ error: 'E2E=true is required for test booking mutations' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const slotStart = body?.slot_start as string | undefined
    const slotEnd = body?.slot_end as string | undefined

    if (!slotStart || !slotEnd) {
      return NextResponse.json({ error: 'slot_start and slot_end are required' }, { status: 400 })
    }

    const cfg = getSupabaseConfig()
    if (!cfg.secretKey) return NextResponse.json({ error: 'Missing SUPABASE_SECRET_KEY' }, { status: 500 })

    const admin = createClient(cfg.url, cfg.secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await admin.rpc('reschedule_booking_atomically', {
      p_booking_id: bookingId,
      p_new_slot_id: body.new_slot_id || body.slot_id // Accept multiple formats
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (data && !data[0].success) return NextResponse.json({ error: data[0].error_message }, { status: 400 })
    
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST(request: Request, context: { params: Promise<Record<string, string>> }) {
  const { id: bookingId } = await context.params

  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  if (process.env.E2E !== 'true') return NextResponse.json({ error: 'E2E=true is required for test booking mutations' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const status = body?.status ?? 'confirmed'

    const cfg = getSupabaseConfig()
    if (!cfg.secretKey) return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })

    const admin = createClient(cfg.url, cfg.secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await admin.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', bookingId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}


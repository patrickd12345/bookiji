import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseClient()

  try {
    const { ticketId, status } = await req.json()
    if (!ticketId || !status) {
      return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 })
    }

    const { error } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', ticketId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[support/tickets/update] error', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
} 
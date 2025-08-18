import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { verifyRescheduleToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const { token, newStart, newEnd } = await request.json()
    if (!token || !newStart || !newEnd) return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })

    let claims: any
    try {
      claims = verifyRescheduleToken(token)
    } catch {
      return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 401 })
    }

    const { url, secretKey } = getSupabaseConfig()
    const admin = createClient(url, secretKey!, { auth: { persistSession: false } })

    // Atomic finalize via RPC: burns token, validates hold/ownership, inserts new, links old
    const { data: newId, error: rpcErr } = await admin.rpc('reschedule_complete_tx', {
      p_booking: claims.bid ?? claims.bookingId ?? claims.booking_id ?? claims.booking,
      p_customer: claims.sub ?? claims.customer_id ?? claims.customerId,
      p_jti: claims.jti,
      p_new_start: newStart,
      p_new_end: newEnd,
    })

    if (rpcErr || !newId) return NextResponse.json({ error: rpcErr?.message || 'TX_FAILED' }, { status: 400 })
    return NextResponse.json({ success: true, bookingId: newId })
  } catch (error) {
    console.error('Reschedule complete error:', error)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}



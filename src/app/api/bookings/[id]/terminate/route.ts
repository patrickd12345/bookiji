import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { signRescheduleToken } from '@/lib/jwt'
import { getAuthenticatedUserId } from '@/app/api/_utils/auth'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { action } = await request.json()
    
    if (!['cancel', 'reschedule'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url, secretKey } = getSupabaseConfig()
    if (!secretKey) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }

    const admin = createClient(url, secretKey, { auth: { persistSession: false } })

    // Get booking and validate ownership
    const { data: booking, error: fetchError } = await admin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('customer_id', userId)
      .eq('status', 'confirmed')
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found or not accessible' }, { status: 404 })
    }

    if (action === 'cancel') {
      // Simple cancellation
      const { error: cancelError } = await admin
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_by: 'customer',
          cancelled_at: new Date().toISOString(),
          audit_json: { event: 'cancel', by: 'customer', at: new Date().toISOString() }
        })
        .eq('id', id)

      if (cancelError) {
        return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
      }

      // TODO: notify vendor
      return NextResponse.json({ 
        success: true, 
        message: 'Booking cancelled. Note: $1 commitment fee is non-refundable.' 
      })

    } else if (action === 'reschedule') {
      // Initiate reschedule with soft-hold
      const ttlMinutes = 15 // 15 minute hold
      const holdExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
      
      // single-use token: persist jti for burn-on-complete
      const { token, jti } = signRescheduleToken({ 
        sub: booking.customer_id, 
        bid: booking.id, 
        act: 'reschedule' 
      }, ttlMinutes * 60)
      
      const { error: tokErr } = await admin
        .from('reschedule_tokens')
        .insert({ 
          jti, 
          booking_id: booking.id,
          expires_at: holdExpiresAt
        })

      if (tokErr) {
        return NextResponse.json({ error: 'Failed to create reschedule token' }, { status: 500 })
      }

      // Set booking to reschedule hold
      const { error: holdError } = await admin
        .from('bookings')
        .update({ 
          status: 'canceled_reschedule_hold',
          reschedule_in_progress: true,
          reschedule_hold_expires_at: holdExpiresAt,
          audit_json: { 
            event: 'reschedule_init', 
            by: 'customer', 
            at: new Date().toISOString(),
            hold_until: holdExpiresAt
          }
        })
        .eq('id', id)

      if (holdError) {
        return NextResponse.json({ error: 'Failed to set reschedule hold' }, { status: 500 })
      }

      // Return success with token and prefill data
      return NextResponse.json({ 
        success: true, 
        token,
        holdExpiresAt,
        prefill: {
          vendor_id: booking.vendor_id,
          service_id: booking.service_id,
          suggestedStart: booking.slot_start,
          suggestedEnd: booking.slot_end
        },
        message: `Current booking held for ${ttlMinutes} minutes. Pick a new time to complete reschedule.`
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Terminate error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}



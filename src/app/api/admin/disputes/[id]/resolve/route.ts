import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/config/supabase'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { bookingStateMachine } from '@/lib/services/bookingStateMachine'
import { processRefund } from '@/lib/services/refundService'

interface ResolveDisputeRequest {
  status: 'resolved' | 'closed' | 'rejected'
  resolution: string
  resolution_amount?: number
  resolution_type: 'refund' | 'reschedule' | 'partial_refund' | 'credit' | 'rejected' | 'other'
  admin_notes?: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const { id: disputeId } = await context.params
  try {
    const cookieStore = await cookies()
    const config = getSupabaseConfig()
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await requireAdmin({ user })

    const body: ResolveDisputeRequest = await request.json()
    const { status, resolution, resolution_amount, resolution_type, admin_notes } = body

    if (!status || !resolution || !resolution_type) {
      return NextResponse.json(
        { error: 'Missing required fields: status, resolution, resolution_type' },
        { status: 400 }
      )
    }

    // Get dispute details
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select(`
        *,
        bookings!inner(
          id,
          customer_id,
          provider_id,
          status,
          total_amount_cents,
          commitment_fee_paid,
          payment_intent_id,
          idempotency_key
        )
      `)
      .eq('id', disputeId)
      .single()

    if (disputeError || !dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      )
    }

    if (dispute.status === 'resolved' || dispute.status === 'closed') {
      return NextResponse.json(
        { error: 'Dispute already resolved' },
        { status: 400 }
      )
    }

    // Use database function to resolve dispute
    const { error: resolveError } = await supabase.rpc('resolve_dispute', {
      p_dispute_id: disputeId,
      p_admin_id: adminUser.id,
      p_resolution: resolution,
      p_resolution_amount: resolution_amount || null,
      p_resolution_type: resolution_type,
      p_admin_notes: admin_notes || null
    })

    if (resolveError) {
      console.error('Error resolving dispute:', resolveError)
      return NextResponse.json(
        { error: 'Failed to resolve dispute' },
        { status: 500 }
      )
    }

    // Process refund if needed
    let refundResult = null
    if ((resolution_type === 'refund' || resolution_type === 'partial_refund') && dispute.bookings) {
      const booking = dispute.bookings
      if (booking.commitment_fee_paid && booking.payment_intent_id) {
        try {
          refundResult = await processRefund(booking.id, {
            idempotencyKey: booking.idempotency_key,
            reason: `Dispute resolution: ${resolution}`,
            adminId: adminUser.id
          })
        } catch (refundError) {
          console.error('Refund processing error:', refundError)
          // Don't fail the resolution if refund fails - it can be processed manually
        }
      }
    }

    // Update booking status if no-show
    if (dispute.dispute_type === 'no_show' && dispute.bookings) {
      try {
        await bookingStateMachine.transition(dispute.bookings.id, 'no_show', {
          reason: 'No-show confirmed via dispute resolution',
          adminId: adminUser.id,
          adminOverride: true,
          skipRefund: true // Refund already handled above
        })
      } catch (transitionError) {
        console.error('Booking status transition error:', transitionError)
        // Don't fail the resolution if transition fails
      }
    }

    // Send notifications
    await supabase.from('admin_notifications').insert([{
      type: 'dispute_resolved',
      title: `Dispute Resolved - ${dispute.dispute_type}`,
      message: `Dispute ${disputeId} has been resolved: ${resolution}`,
      metadata: { dispute_id: disputeId, resolution_type },
      priority: 'medium',
      created_at: new Date().toISOString()
    }])

    return NextResponse.json({
      success: true,
      message: 'Dispute resolved successfully',
      dispute_id: disputeId,
      refund_result: refundResult
    })
  } catch (error) {
    console.error('Admin dispute resolution error:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


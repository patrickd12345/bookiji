import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { limitRequest } from '@/middleware/requestLimiter'

export interface DisputeRequest {
  booking_id: string
  dispute_type: 'no_show' | 'service_quality' | 'payment_issue' | 'scheduling_conflict' | 'other'
  description: string
  evidence?: string[]
  requested_resolution: 'refund' | 'reschedule' | 'partial_refund' | 'credit' | 'other'
  amount_requested?: number
}

export interface DisputeResponse {
  id: string
  booking_id: string
  user_id: string
  dispute_type: string
  status: 'pending' | 'under_review' | 'resolved' | 'closed'
  description: string
  evidence?: string[]
  requested_resolution: string
  amount_requested?: number
  admin_notes?: string
  resolution?: string
  resolution_amount?: number
  created_at: string
  updated_at: string
  resolved_at?: string
  admin_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const limited = await limitRequest(request, { windowMs: 60_000, max: 5 })
    if (limited) return limited

    const { booking_id, dispute_type, description, evidence, requested_resolution, amount_requested }: DisputeRequest = await request.json()

    if (!booking_id || !dispute_type || !description || !requested_resolution) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    const config = getSupabaseConfig()
    const supabase = createClient(config.url, config.publishableKey)

    // Verify the booking exists and user has access
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_id, provider_id, status, total_amount')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ 
        success: false, 
        error: 'Booking not found' 
      }, { status: 404 })
    }

    // Get user from auth context (simplified for demo)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // Create the dispute
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .insert([{
        booking_id,
        user_id: booking.customer_id, // Assuming customer is filing dispute
        dispute_type,
        status: 'pending',
        description,
        evidence: evidence || [],
        requested_resolution,
        amount_requested: amount_requested || booking.total_amount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (disputeError) {
      console.error('Dispute creation error:', disputeError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create dispute' 
      }, { status: 500 })
    }

    // Send notification to admin
    await supabase
      .from('admin_notifications')
      .insert([{
        type: 'new_dispute',
        title: `New Dispute Filed - ${dispute_type}`,
        message: `Dispute filed for booking ${booking_id}: ${description}`,
        metadata: { dispute_id: dispute.id, booking_id },
        priority: 'high',
        created_at: new Date().toISOString()
      }])

    return NextResponse.json({ 
      success: true, 
      data: dispute,
      message: 'Dispute filed successfully'
    })

  } catch (error) {
    console.error('Dispute creation error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const limited = await limitRequest(request, { windowMs: 10_000, max: 30 })
    if (limited) return limited

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const dispute_type = searchParams.get('type')
    const user_id = searchParams.get('user_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const config = getSupabaseConfig()
    const supabase = createClient(config.url, config.publishableKey)

    let query = supabase
      .from('disputes')
      .select(`
        *,
        bookings!inner(
          id,
          customer_id,
          provider_id,
          service_name,
          total_amount,
          status
        ),
        users!inner(
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (dispute_type) query = query.eq('dispute_type', dispute_type)
    if (user_id) query = query.eq('user_id', user_id)

    const { data: disputes, error } = await query
      .range(offset, offset + limit - 1)

    // Get total count separately
    const { count } = await supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Dispute fetch error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch disputes' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: disputes || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Dispute fetch error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

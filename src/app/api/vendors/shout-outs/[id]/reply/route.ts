import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

interface CreateOfferRequest {
  service_id: string
  slot_start: string
  slot_end: string
  price_cents: number
  message?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const config = getSupabaseConfig()
    const supabase = createServerClient(
      config.url,
      config.publishableKey || config.anonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    // Get authenticated user and verify they're a vendor
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a vendor
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'vendor') {
      return NextResponse.json(
        { error: 'Access denied. Vendor role required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      service_id, 
      slot_start, 
      slot_end, 
      price_cents, 
      message 
    } = body as CreateOfferRequest

    // Validate required fields
    if (!service_id || !slot_start || !slot_end || !price_cents) {
      return NextResponse.json(
        { error: 'Missing required fields: service_id, slot_start, slot_end, price_cents' },
        { status: 400 }
      )
    }

    // Validate price
    if (price_cents < 100) { // Minimum $1
      return NextResponse.json(
        { error: 'Price must be at least $1.00' },
        { status: 400 }
      )
    }

    // Validate dates
    const startDate = new Date(slot_start)
    const endDate = new Date(slot_end)
    const now = new Date()

    if (startDate <= now) {
      return NextResponse.json(
        { error: 'Slot start time must be in the future' },
        { status: 400 }
      )
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'Slot end time must be after start time' },
        { status: 400 }
      )
    }

    // Verify the shout-out exists and is active
    const { data: shoutOut, error: shoutOutError } = await supabase
      .from('shout_outs')
      .select('*')
      .eq('id', id)
      .single()

    if (shoutOutError || !shoutOut) {
      return NextResponse.json(
        { error: 'Shout-out not found' },
        { status: 404 }
      )
    }

    if (shoutOut.status !== 'active') {
      return NextResponse.json(
        { error: 'Shout-out is no longer active' },
        { status: 400 }
      )
    }

    if (new Date() > new Date(shoutOut.expires_at)) {
      return NextResponse.json(
        { error: 'Shout-out has expired' },
        { status: 400 }
      )
    }

    // Verify the service belongs to the vendor and matches the category
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service_id)
      .eq('vendor_id', user.id)
      .eq('is_active', true)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found or not owned by vendor' },
        { status: 404 }
      )
    }

    if (service.category !== shoutOut.service_type) {
      return NextResponse.json(
        { error: 'Service category does not match shout-out requirement' },
        { status: 400 }
      )
    }

    // Verify vendor was notified about this shout-out
    const { data: recipient, error: recipientError } = await supabase
      .from('shout_out_recipients')
      .select('*')
      .eq('shout_out_id', id)
      .eq('vendor_id', user.id)
      .single()

    if (recipientError || !recipient) {
      return NextResponse.json(
        { error: 'You are not eligible to respond to this shout-out' },
        { status: 403 }
      )
    }

    // Check if vendor already made an offer
    const { data: existingOffer, error: existingOfferError } = await supabase
      .from('shout_out_offers')
      .select('*')
      .eq('shout_out_id', id)
      .eq('vendor_id', user.id)
      .single()

    if (existingOffer && !existingOfferError) {
      return NextResponse.json(
        { error: 'You have already made an offer for this shout-out' },
        { status: 400 }
      )
    }

    // Create the offer
    const { data: offer, error: offerError } = await supabase
      .from('shout_out_offers')
      .insert([{
        shout_out_id: id,
        vendor_id: user.id,
        service_id,
        slot_start,
        slot_end,
        price_cents,
        message: message || null,
        status: 'pending'
      }])
      .select()
      .single()

    if (offerError) {
      console.error('Error creating offer:', offerError)
      return NextResponse.json(
        { error: 'Failed to create offer' },
        { status: 500 }
      )
    }

    // Update recipient status to 'offered'
    const { error: updateRecipientError } = await supabase
      .from('shout_out_recipients')
      .update({ response_status: 'offered' })
      .eq('shout_out_id', id)
      .eq('vendor_id', user.id)

    if (updateRecipientError) {
      console.error('Error updating recipient status:', updateRecipientError)
      // Continue anyway, as the offer was created successfully
    }

    // Record metrics for offer creation
    await supabase.rpc('record_shout_out_metric', {
      p_shout_out_id: id,
      p_vendor_id: user.id,
      p_event: 'offer_sent',
      p_metadata: { 
        offer_id: offer.id,
        price_cents: price_cents,
        service_id: service_id
      }
    })

    // TODO: Send notification to customer about new offer
    // This can be added later as part of the notification system

    return NextResponse.json({
      success: true,
      offer_id: offer.id,
      message: 'Offer created successfully'
    })

  } catch (error) {
    console.error('Error creating offer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const config = getSupabaseConfig()
    const supabase = createServerClient(
      config.url,
      config.publishableKey || config.anonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    // Get authenticated user and verify they're a vendor
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get shout-out details for the vendor
    const { data: shoutOut, error: shoutOutError } = await supabase
      .from('shout_outs')
      .select(`
        *,
        shout_out_recipients!inner (
          response_status,
          notified_at
        )
      `)
      .eq('id', id)
      .eq('shout_out_recipients.vendor_id', user.id)
      .single()

    if (shoutOutError || !shoutOut) {
      return NextResponse.json(
        { error: 'Shout-out not found or not accessible' },
        { status: 404 }
      )
    }

    // Check if vendor already made an offer
    const { data: existingOffer } = await supabase
      .from('shout_out_offers')
      .select('*')
      .eq('shout_out_id', id)
      .eq('vendor_id', user.id)
      .single()

    // Mark as viewed if not already done
    if (shoutOut.shout_out_recipients[0]?.response_status === 'pending') {
      await supabase
        .from('shout_out_recipients')
        .update({ response_status: 'viewed' })
        .eq('shout_out_id', id)
        .eq('vendor_id', user.id)
    }

    return NextResponse.json({
      success: true,
      shout_out: {
        id: shoutOut.id,
        service_type: shoutOut.service_type,
        description: shoutOut.description,
        radius_km: shoutOut.radius_km,
        status: shoutOut.status,
        expires_at: shoutOut.expires_at,
        created_at: shoutOut.created_at
      },
      existing_offer: existingOffer,
      can_respond: shoutOut.status === 'active' && new Date() < new Date(shoutOut.expires_at) && !existingOffer
    })

  } catch (error) {
    console.error('Error fetching shout-out details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

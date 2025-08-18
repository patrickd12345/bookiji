import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

async function checkAdminAuth() {
  const { url, secretKey } = getSupabaseConfig()
  const cookieStore = cookies()
  
  const supabase = createClient(url, secretKey!, { 
    auth: { persistSession: false },
    global: { headers: { Cookie: cookieStore.toString() } }
  })
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { authorized: false, supabase: null, user: null }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  
  if (!profile || profile.role !== 'admin') {
    return { authorized: false, supabase: null, user: null }
  }
  
  return { authorized: true, supabase, user }
}

export async function GET(request: NextRequest) {
  try {
    const { authorized, supabase } = await checkAdminAuth()
    
    if (!authorized || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        vendor_id,
        status,
        service_name,
        scheduled_for,
        amount_cents,
        created_at,
        updated_at,
        customer:profiles!customer_id(email, full_name),
        vendor:profiles!vendor_id(email, full_name),
        reschedule_tokens(id, expires_at)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    // Transform the data for the frontend
    const transformedBookings = bookings?.map(booking => ({
      id: booking.id,
      customer_id: booking.customer_id,
      vendor_id: booking.vendor_id,
      status: booking.status,
      service_name: booking.service_name,
      scheduled_for: booking.scheduled_for,
      amount_cents: booking.amount_cents,
      created_at: booking.created_at,
      customer_email: (booking.customer as any)?.email,
      vendor_name: (booking.vendor as any)?.full_name,
      has_hold: booking.reschedule_tokens && booking.reschedule_tokens.length > 0
    })) || []

    return NextResponse.json({ 
      bookings: transformedBookings,
      count: transformedBookings.length 
    })
    
  } catch (error) {
    console.error('Error in admin bookings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

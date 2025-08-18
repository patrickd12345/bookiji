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

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { authorized, supabase } = await checkAdminAuth()
    
    if (!authorized || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: booking, error } = await supabase
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
        notes,
        customer:profiles!customer_id(email, full_name),
        vendor:profiles!vendor_id(email, full_name),
        reschedule_tokens(id, expires_at, token)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Transform the data for the frontend
    const transformedBooking = {
      id: booking.id,
      customer_id: booking.customer_id,
      vendor_id: booking.vendor_id,
      status: booking.status,
      service_name: booking.service_name,
      scheduled_for: booking.scheduled_for,
      amount_cents: booking.amount_cents,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      notes: booking.notes,
      customer_email: (booking.customer as any)?.email,
      customer_name: (booking.customer as any)?.full_name,
      vendor_email: (booking.vendor as any)?.email,
      vendor_name: (booking.vendor as any)?.full_name,
      has_hold: booking.reschedule_tokens && booking.reschedule_tokens.length > 0,
      hold_expires_at: booking.reschedule_tokens?.[0]?.expires_at,
      reschedule_token: booking.reschedule_tokens?.[0]?.token
    }

    return NextResponse.json(transformedBooking)
    
  } catch (error) {
    console.error('Error in admin booking detail API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

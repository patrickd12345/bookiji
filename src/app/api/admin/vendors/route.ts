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
    const filter = searchParams.get('filter') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        business_name,
        is_active,
        created_at,
        last_login,
        role
      `)
      .eq('role', 'vendor')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (filter === 'active') {
      query = query.eq('is_active', true)
    } else if (filter === 'inactive') {
      query = query.eq('is_active', false)
    } else if (filter === 'new') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      query = query.gte('created_at', weekAgo.toISOString())
    }

    const { data: vendors, error } = await query

    if (error) {
      console.error('Error fetching vendors:', error)
      return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
    }

    // Get additional stats for each vendor
    const vendorIds = vendors?.map(v => v.id) || []
    
    // Get booking counts
    const { data: bookingStats } = await supabase
      .from('bookings')
      .select('vendor_id')
      .in('vendor_id', vendorIds)

    // Get service counts (assuming you have a services table)
    const { data: serviceStats } = await supabase
      .from('services')
      .select('vendor_id')
      .in('vendor_id', vendorIds)
      .eq('is_active', true)

    // Transform the data for the frontend
    const transformedVendors = vendors?.map(vendor => {
      const totalBookings = bookingStats?.filter(b => b.vendor_id === vendor.id).length || 0
      const activeServices = serviceStats?.filter(s => s.vendor_id === vendor.id).length || 0

      return {
        id: vendor.id,
        email: vendor.email,
        full_name: vendor.full_name,
        business_name: vendor.business_name,
        is_active: vendor.is_active ?? true, // Default to true if not set
        created_at: vendor.created_at,
        last_login: vendor.last_login,
        total_bookings: totalBookings,
        active_services: activeServices
      }
    }) || []

    return NextResponse.json({ 
      vendors: transformedVendors,
      count: transformedVendors.length 
    })
    
  } catch (error) {
    console.error('Error in admin vendors API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
      .from('audit_logs')
      .select(`
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at,
        user:profiles!user_id(email, full_name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (filter === 'bookings') {
      query = query.eq('entity_type', 'booking')
    } else if (filter === 'vendors') {
      query = query.eq('entity_type', 'vendor')
    } else if (filter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      query = query.gte('created_at', today.toISOString())
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching audit events:', error)
      return NextResponse.json({ error: 'Failed to fetch audit events' }, { status: 500 })
    }

    // Transform the data for the frontend
    const transformedEvents = events?.map(event => ({
      id: event.id,
      user_id: event.user_id,
      action: event.action,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      metadata: event.metadata,
      created_at: event.created_at,
      user_email: (event.user as any)?.email,
      user_name: (event.user as any)?.full_name
    })) || []

    return NextResponse.json({ 
      events: transformedEvents,
      count: transformedEvents.length 
    })
    
  } catch (error) {
    console.error('Error in admin audit API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

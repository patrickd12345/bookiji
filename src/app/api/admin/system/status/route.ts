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

    // Get DLQ count (this assumes you have a dead_letter_queue table)
    let dlqCount = 0
    try {
      const { count } = await supabase
        .from('dead_letter_queue')
        .select('*', { count: 'exact', head: true })
      dlqCount = count || 0
    } catch {
      dlqCount = 0 // Fallback if table doesn't exist
    }

    // Get today's bookings count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todayBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    // Get active vendors count
    const { count: activeVendors } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'vendor')
      .eq('is_active', true)

    // Get pending reschedules count
    const { count: pendingReschedules } = await supabase
      .from('reschedule_tokens')
      .select('*', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString())

    // Test database connectivity
    let databaseStatus = 'healthy'
    try {
      await supabase.from('profiles').select('id').limit(1)
    } catch {
      databaseStatus = 'error'
    }

    // Build information (you might want to inject these at build time)
    const buildHash = process.env.BUILD_HASH || 'dev-local'
    const buildTimestamp = process.env.BUILD_TIMESTAMP || new Date().toISOString()
    
    // Calculate uptime (this is a simple approximation)
    const startTime = process.env.START_TIME ? new Date(process.env.START_TIME) : new Date()
    const uptime = Math.floor((Date.now() - startTime.getTime()) / 1000)
    const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`

    // Get last cron run (assumes you have a cron_jobs or similar table)
    let lastCron = null
    try {
      const { data } = await supabase
        .from('cron_logs')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lastCron = data
    } catch {
      lastCron = null
    }

    const systemStats = {
      dlq_count: dlqCount,
      build_hash: buildHash,
      build_timestamp: buildTimestamp,
      uptime: uptimeFormatted,
      database_status: databaseStatus,
      last_cron_run: lastCron?.created_at,
      total_bookings_today: todayBookings || 0,
      active_vendors: activeVendors || 0,
      pending_reschedules: pendingReschedules || 0
    }

    return NextResponse.json(systemStats)
    
  } catch (error) {
    console.error('Error in admin system status API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

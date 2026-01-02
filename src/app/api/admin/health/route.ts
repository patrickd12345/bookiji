import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { rateLimit } from '@/lib/ratelimit'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      await requireAdmin({ user })
    } catch {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const rateLimitKey = `admin:${user.email}:health`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const checks: Record<string, any> = {}

    // DB connectivity check
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
      checks.database = { healthy: !error, error: error?.message || null }
    } catch (err) {
      checks.database = { healthy: false, error: String(err) }
    }

    // Payments readiness: check payments_outbox and payments_dlq counts if tables exist
    try {
      const { data: outboxCount } = await supabase
        .from('payments_outbox')
        .select('id', { count: 'exact', head: true })
      const { data: dlqCount } = await supabase
        .from('payments_dlq')
        .select('id', { count: 'exact', head: true })
      checks.payments = { outboxCount: outboxCount || 0, dlqCount: dlqCount || 0, healthy: true }
    } catch (err) {
      checks.payments = { healthy: false, warning: 'payments tables unavailable', error: String(err) }
    }

    // Search / indexing check (if search table exists)
    try {
      const { data: idx, error } = await supabase
        .from('performance_metrics')
        .select('id')
        .limit(1)
      checks.metrics = { healthy: !error, error: error?.message || null }
    } catch (err) {
      checks.metrics = { healthy: false, error: String(err) }
    }

    // SLO summary (lightweight)
    try {
      const { data: sloData } = await supabase
        .from('slo_summary')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(1)
      checks.slo = { healthy: Boolean(sloData && sloData.length > 0), data: sloData?.[0] || null }
    } catch {
      checks.slo = { healthy: false, hint: 'slo_summary not configured' }
    }

    return NextResponse.json({
      status: 'ok',
      checks,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin health API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}


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

    const rateLimitKey = `admin:${user.email}:abuse-rate-violations`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(10, parseInt(searchParams.get('limit') || '50')), 200)
    const ip = searchParams.get('ip')
    const timeRange = searchParams.get('timeRange') || '24h'

    const now = Date.now()
    let startTime = new Date(now - 24 * 60 * 60 * 1000)
    if (timeRange === '1h') startTime = new Date(now - 60 * 60 * 1000)
    if (timeRange === '6h') startTime = new Date(now - 6 * 60 * 60 * 1000)

    // Try dedicated table first
    try {
      let q = supabase
        .from('rate_limit_violations')
        .select('*')
        .gte('first_violation', startTime.toISOString())
        .order('last_violation', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)
      if (ip) q = q.eq('ip_address', ip)
      const { data, error, count } = await q
      if (!error && data) {
        return NextResponse.json({ data, pagination: { page, limit, total: count || data.length } })
      }
    } catch {
      // fallback
    }

    // Fallback: aggregate access_log locally
    try {
      const { data: logs, error } = await supabase
        .from('access_log')
        .select('ip_address, path, method, status, user_agent, created_at')
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: false })
        .limit(5000)
      if (error) {
        console.error('Abuse violations fallback error:', error)
        return NextResponse.json({ data: [], pagination: { page, limit, total: 0 } })
      }

      const counts: Record<string, number> = {}
      for (const row of logs || []) {
        const ipAddr = (row as any).ip_address || 'unknown'
        counts[ipAddr] = (counts[ipAddr] || 0) + 1
      }

      const entries = Object.entries(counts)
        .map(([ipAddr, count]) => ({ ip: ipAddr, count }))
        .sort((a, b) => b.count - a.count)

      const filtered = ip ? entries.filter(e => e.ip === ip) : entries
      const sliced = filtered.slice((page - 1) * limit, page * limit)

      return NextResponse.json({ data: sliced, pagination: { page, limit, total: entries.length } })
    } catch (err) {
      console.error('Abuse rate-limit violations API error:', err)
      return NextResponse.json({ data: [], pagination: { page, limit, total: 0 } })
    }

  } catch (error) {
    console.error('Admin abuse rate-limit violations API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}


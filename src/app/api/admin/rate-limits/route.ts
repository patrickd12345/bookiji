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

    const rateLimitKey = `admin:${user.email}:rate-limits`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(10, parseInt(searchParams.get('limit') || '50')), 200)
    const ip = searchParams.get('ip')
    const endpoint = searchParams.get('endpoint')
    const timeRange = searchParams.get('timeRange') || '24h' // '1h','6h','24h'

    const now = new Date()
    let startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    if (timeRange === '1h') startTime = new Date(now.getTime() - 60 * 60 * 1000)
    if (timeRange === '6h') startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)

    const offset = (page - 1) * limit

    // Primary source: rate_limit_violations table (if present)
    try {
      let query = supabase
        .from('rate_limit_violations')
        .select('*')
        .gte('last_violation', startTime.toISOString())
        .order('last_violation', { ascending: false })
        .range(offset, offset + limit - 1)

      if (ip) query = query.eq('ip_address', ip)
      if (endpoint) query = query.eq('endpoint', endpoint)

      const { data, error, count } = await query
      if (!error && data) {
        return NextResponse.json({
          data,
          pagination: { page, limit, total: count || data.length, hasNext: (count || data.length) > offset + data.length }
        })
      }
    } catch (e) {
      // fallthrough to access_log if table missing or permissions
    }

    // Fallback: query access_log for 429 responses
    try {
      let query = supabase
        .from('access_log')
        .select('ip_address, path, method, status, user_agent, created_at')
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      query = query.eq('status', 429)
      if (ip) query = query.eq('ip_address', ip)
      if (endpoint) query = query.ilike('path', `%${endpoint}%`)

      const { data, error, count } = await query
      if (error) {
        console.error('Rate-limits fallback fetch error:', error)
        return NextResponse.json({ data: [], pagination: { page, limit, total: 0 } })
      }

      return NextResponse.json({
        data: data || [],
        pagination: { page, limit, total: count || (data || []).length, hasNext: (count || (data || []).length) > offset + (data || []).length }
      })
    } catch (err) {
      console.error('Rate-limits API error:', err)
      return NextResponse.json({ data: [], pagination: { page, limit, total: 0 } })
    }

  } catch (error) {
    console.error('Admin rate-limits API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}


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

    const rateLimitKey = `admin:${user.email}:errors`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(10, parseInt(searchParams.get('limit') || '50')), 200)
    const endpoint = searchParams.get('endpoint')
    const severity = searchParams.get('severity')
    const timeRange = searchParams.get('timeRange') || '24h'

    const now = Date.now()
    let startTime = new Date(now - 24 * 60 * 60 * 1000)
    if (timeRange === '1h') startTime = new Date(now - 60 * 60 * 1000)
    if (timeRange === '6h') startTime = new Date(now - 6 * 60 * 60 * 1000)

    // Prefer dedicated error_log table
    try {
      let query = supabase
        .from('error_log')
        .select('*')
        .gte('last_seen', startTime.toISOString())
        .order('last_seen', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (endpoint) query = query.eq('endpoint', endpoint)
      if (severity) query = query.eq('severity', severity)

      const { data, error, count } = await query
      if (!error && data) {
        return NextResponse.json({ data, pagination: { page, limit, total: count || data.length } })
      }
    } catch {
      // fallback
    }

    return NextResponse.json({
      data: [],
      pagination: { page, limit, total: 0 },
      hint: 'No error_log table found or permission denied. Consider enabling error aggregation or Sentry.'
    })

  } catch (error) {
    console.error('Admin errors API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}


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

    const rateLimitKey = `admin:${user.email}:errors-trends`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const granularity = searchParams.get('granularity') || 'hour' // hour, day
    const timeRange = searchParams.get('timeRange') || '24h'

    const now = Date.now()
    let startTime = new Date(now - 24 * 60 * 60 * 1000)
    if (timeRange === '1h') startTime = new Date(now - 60 * 60 * 1000)
    if (timeRange === '6h') startTime = new Date(now - 6 * 60 * 60 * 1000)

    // Prefer an aggregated error_timeseries table
    try {
      const { data, error } = await supabase
        .from('error_timeseries')
        .select('*')
        .gte('bucket_start', startTime.toISOString())
        .order('bucket_start', { ascending: true })
      if (!error && data) {
        return NextResponse.json({ series: data })
      }
    } catch {
      // fallback to empty
    }

    return NextResponse.json({ series: [], hint: 'No error_timeseries table found; consider adding aggregation job.' })

  } catch (error) {
    console.error('Admin errors trends API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}


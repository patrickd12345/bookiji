import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { rateLimit } from '@/lib/ratelimit'

type Pattern = {
  type: string
  description: string
  severity: 'low' | 'medium' | 'high'
  samples: Array<Record<string, unknown>>
}

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

    const rateLimitKey = `admin:${user.email}:abuse-patterns`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    const now = new Date()
    let startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    if (timeRange === '1h') startTime = new Date(now.getTime() - 60 * 60 * 1000)
    if (timeRange === '6h') startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)

    // Try to read a dedicated table first
    try {
      const { data: patterns, error } = await supabase
        .from('abuse_patterns')
        .select('*')
        .gte('detected_at', startTime.toISOString())
        .order('detected_at', { ascending: false })
        .limit(200)
      if (!error && patterns) {
        return NextResponse.json({ patterns })
      }
    } catch {
      // ignore and run fallback analysis
    }

    // Fallback: basic aggregation from access_log and auth_failures
    try {
      const { data: logs, error } = await supabase
        .from('access_log')
        .select('ip_address, path, method, status, user_agent, created_at')
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: false })
        .limit(5000)

      if (error) {
        console.error('Abuse patterns access_log error:', error)
        return NextResponse.json({ patterns: [] })
      }

      // Aggregate counts per IP and failed auths
      const ipCounts: Record<string, number> = {}
      const ipFailedAuth: Record<string, number> = {}
      for (const row of logs || []) {
        const ip = (row as any).ip_address || 'unknown'
        ipCounts[ip] = (ipCounts[ip] || 0) + 1
        const status = (row as any).status
        if (status === 401 || status === 403) {
          ipFailedAuth[ip] = (ipFailedAuth[ip] || 0) + 1
        }
      }

      const highRequesters = Object.entries(ipCounts)
        .filter(([, c]) => c > 100)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)

      const bruteForceCandidates = Object.entries(ipFailedAuth)
        .filter(([, c]) => c > 20)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)

      const patterns: Pattern[] = []
      if (highRequesters.length > 0) {
        patterns.push({
          type: 'high_request_rate',
          description: 'IPs with unusually high request rates in the selected time window',
          severity: 'medium',
          samples: highRequesters.map(([ip, count]) => ({ ip, count }))
        })
      }
      if (bruteForceCandidates.length > 0) {
        patterns.push({
          type: 'failed_auth_spike',
          description: 'IPs with many authentication failures (possible brute-force)',
          severity: 'high',
          samples: bruteForceCandidates.map(([ip, count]) => ({ ip, failedAuthCount: count }))
        })
      }

      return NextResponse.json({ patterns })
    } catch (err) {
      console.error('Abuse patterns API error:', err)
      return NextResponse.json({ patterns: [] })
    }

  } catch (error) {
    console.error('Admin abuse patterns API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}


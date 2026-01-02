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

    const rateLimitKey = `admin:${user.email}:abuse-suspicious`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    const now = Date.now()
    let startTime = new Date(now - 24 * 60 * 60 * 1000)
    if (timeRange === '1h') startTime = new Date(now - 60 * 60 * 1000)
    if (timeRange === '6h') startTime = new Date(now - 6 * 60 * 60 * 1000)

    try {
      const { data: logs, error } = await supabase
        .from('access_log')
        .select('ip_address, path, method, status, user_agent, auth_user_id, created_at')
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: false })
        .limit(5000)

      if (error) {
        console.error('Suspicious activity fetch error:', error)
        return NextResponse.json({ suspicious: [] })
      }

      // Detect many accounts from same IP
      const ipToUsers: Record<string, Set<string>> = {}
      for (const row of logs || []) {
        const ip = (row as any).ip_address || 'unknown'
        const uid = (row as any).auth_user_id || null
        if (!ipToUsers[ip]) ipToUsers[ip] = new Set()
        if (uid) ipToUsers[ip].add(uid)
      }

      const multiAccountIps = Object.entries(ipToUsers)
        .filter(([, users]) => users.size >= 5)
        .map(([ip, users]) => ({ ip, uniqueAccounts: users.size }))
        .sort((a, b) => b.uniqueAccounts - a.uniqueAccounts)

      // Detect unusual user-agent spikes
      const uaCounts: Record<string, number> = {}
      for (const row of logs || []) {
        const ua = (row as any).user_agent || 'unknown'
        uaCounts[ua] = (uaCounts[ua] || 0) + 1
      }
      const topUas = Object.entries(uaCounts)
        .map(([ua, count]) => ({ userAgent: ua, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const suspicious = [
        { type: 'multi_account_ips', description: 'IPs contacting many distinct accounts', severity: 'high', samples: multiAccountIps.slice(0, 20) },
        { type: 'top_user_agents', description: 'Top user agents seen', severity: 'low', samples: topUas }
      ]

      return NextResponse.json({ suspicious })
    } catch (err) {
      console.error('Suspicious activity API error:', err)
      return NextResponse.json({ suspicious: [] })
    }

  } catch (error) {
    console.error('Admin suspicious activity API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}


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

    const rateLimitKey = `admin:${user.email}:kill-switches`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    try {
      const { data, error } = await supabase
        .from('system_flags')
        .select('flag_name, value, reason, last_changed_at')
        .order('last_changed_at', { ascending: false })

      if (error) {
        // If system_flags table missing, try scheduling kill switch specific table/row
        throw error
      }

      return NextResponse.json({ flags: data || [], timestamp: new Date().toISOString() })
    } catch (_err) {
      // Fallback: read scheduling flag from dedicated table or function
      try {
        const { data } = await supabase
          .from('scheduling_kill_switch')
          .select('is_enabled, reason, updated_at')
          .limit(1)
        return NextResponse.json({ flags: data || [], fallback: true, timestamp: new Date().toISOString() })
      } catch (err) {
        console.warn('Kill switches fetch warning:', err)
        return NextResponse.json({ flags: [], hint: 'No system_flags table found. Consider creating one for centralized flags.' })
      }
    }

  } catch (error) {
    console.error('Admin kill-switches API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}


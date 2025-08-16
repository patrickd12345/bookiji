import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const config = getSupabaseConfig()
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin via user_role_summary view when available
    const { data: roleSummary } = await supabase
      .from('user_role_summary')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!roleSummary?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('processed_webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch processed_webhook_events:', error)
      }
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json({ events: data ?? [] })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('processed-events GET error:', error)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



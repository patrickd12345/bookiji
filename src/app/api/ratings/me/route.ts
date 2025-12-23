import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/config/supabase'
import { detectLocaleFromHeaders } from '@/lib/i18n/config'
import { t } from '@/lib/i18n/server'

function mapProfileRole(role: string): 'customer' | 'provider' | null {
  if (role === 'customer') return 'customer'
  if (role === 'vendor') return 'provider'
  return null
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const config = getSupabaseConfig()
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (error) {
          // The `setAll` method was called from a Server Component or Route Handler.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      }
    }
  })
  const locale = detectLocaleFromHeaders(request.headers.get('accept-language') ?? undefined).code

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: t(locale, 'error.auth_required') }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: t(locale, 'error.profile_not_found') }, { status: 404 })
    }

    const role = mapProfileRole(profile.role)

    const { data: ratings, error } = await supabase
      .from('ratings')
      .select('id, booking_id, rater_user_id, rater_role, stars, comment, created_at')
      .eq('ratee_user_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: t(locale, 'error.rating_fetch_failed') }, { status: 500 })
    }

    let aggregate = null
    if (role) {
      const { data: aggregateRow } = await supabase
        .from('rating_aggregates')
        .select('avg_rating, rating_count, last_updated')
        .eq('user_id', profile.id)
        .eq('role', role)
        .maybeSingle()

      if (aggregateRow) {
        aggregate = aggregateRow
      }
    }

    return NextResponse.json({
      ratings: ratings || [],
      aggregate
    })
  } catch (error) {
    console.error('Ratings fetch error:', error)
    return NextResponse.json({ error: t(locale, 'error.rating_fetch_failed') }, { status: 500 })
  }
}

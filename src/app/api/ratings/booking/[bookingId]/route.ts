import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/config/supabase'
import { detectLocaleFromHeaders } from '@/lib/i18n/config'
import { t } from '@/lib/i18n/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const { bookingId } = await context.params
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
        } catch (_error) {
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

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: t(locale, 'error.booking_not_found') }, { status: 404 })
    }

    if (!['confirmed', 'completed'].includes(booking.status)) {
      return NextResponse.json({ error: t(locale, 'error.rating_not_allowed') }, { status: 403 })
    }

    const vendorId = (booking as { vendor_id?: string; provider_id?: string }).vendor_id
      ?? (booking as { vendor_id?: string; provider_id?: string }).provider_id

    const isParticipant =
      booking.customer_id === profile.id || vendorId === profile.id
    const isAdmin = profile.role === 'admin'

    if (!isParticipant && !isAdmin) {
      return NextResponse.json({ error: t(locale, 'error.rating_not_allowed') }, { status: 403 })
    }

    const { data: ratings, error } = await supabase
      .from('ratings')
      .select('id, booking_id, rater_user_id, ratee_user_id, rater_role, ratee_role, stars, comment, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: t(locale, 'error.rating_fetch_failed') }, { status: 500 })
    }

    await supabase.from('analytics_events').insert({
      event_type: 'rating.viewed',
      user_id: profile.id,
      event_data: { booking_id: bookingId },
      created_at: new Date().toISOString()
    })

    return NextResponse.json({ ratings: ratings || [] })
  } catch (error) {
    console.error('Ratings booking fetch error:', error)
    return NextResponse.json({ error: t(locale, 'error.rating_fetch_failed') }, { status: 500 })
  }
}

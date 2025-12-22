import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/config/supabase'
import { detectLocaleFromHeaders } from '@/lib/i18n/config'
import { t } from '@/lib/i18n/server'
import { isHalfStarRating, isValidRatingComment } from '@/lib/ratings/validation'

interface RatingRequest {
  booking_id: string
  stars: number
  comment?: string
}

function mapProfileRole(role: string): 'customer' | 'provider' | null {
  if (role === 'customer') return 'customer'
  if (role === 'vendor') return 'provider'
  return null
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const config = getSupabaseConfig()
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      }
    }
  })
  const locale = detectLocaleFromHeaders(request.headers.get('accept-language') ?? undefined).code

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: t(locale, 'error.auth_required') }, { status: 401 })
    }

    const body: RatingRequest = await request.json()
    const bookingId = body.booking_id
    const stars = body.stars
    const comment = body.comment?.trim() || null

    if (!bookingId || stars === undefined) {
      return NextResponse.json({ error: t(locale, 'error.missing_fields') }, { status: 400 })
    }

    if (!isHalfStarRating(stars)) {
      return NextResponse.json({ error: t(locale, 'error.rating_invalid') }, { status: 400 })
    }

    if (!isValidRatingComment(comment)) {
      return NextResponse.json({ error: t(locale, 'error.rating_comment_too_long') }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: t(locale, 'error.profile_not_found') }, { status: 404 })
    }

    const mappedRole = mapProfileRole(profile.role)
    if (!mappedRole) {
      return NextResponse.json({ error: t(locale, 'error.rating_not_allowed') }, { status: 403 })
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

    let raterRole: 'customer' | 'provider' | null = null
    let rateeRole: 'customer' | 'provider' | null = null
    let rateeId: string | null = null

    if (booking.customer_id === profile.id) {
      raterRole = 'customer'
      rateeRole = 'provider'
      rateeId = vendorId || null
    } else if (vendorId === profile.id) {
      raterRole = 'provider'
      rateeRole = 'customer'
      rateeId = booking.customer_id
    }

    if (!raterRole || !rateeRole || !rateeId) {
      return NextResponse.json({ error: t(locale, 'error.rating_not_allowed') }, { status: 403 })
    }

    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('rater_role', raterRole)
      .maybeSingle()

    if (existingRating?.id) {
      return NextResponse.json({ error: t(locale, 'error.rating_duplicate') }, { status: 409 })
    }

    const { data: rating, error: ratingError } = await supabase
      .from('ratings')
      .insert({
        booking_id: bookingId,
        rater_user_id: profile.id,
        ratee_user_id: rateeId,
        rater_role: raterRole,
        ratee_role: rateeRole,
        stars,
        comment
      })
      .select('id, booking_id, stars, comment, created_at')
      .single()

    if (ratingError || !rating) {
      return NextResponse.json({ error: t(locale, 'error.rating_create_failed') }, { status: 500 })
    }

    await supabase.from('analytics_events').insert({
      event_type: 'rating.submitted',
      user_id: profile.id,
      event_data: {
        booking_id: bookingId,
        stars,
        rater_role: raterRole
      },
      created_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      rating
    })
  } catch (error) {
    console.error('Rating creation error:', error)
    return NextResponse.json({ error: t(locale, 'error.rating_create_failed') }, { status: 500 })
  }
}

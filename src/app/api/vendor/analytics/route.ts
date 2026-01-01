import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { cookies } from 'next/headers'

/**
 * GET /api/vendor/analytics
 * 
 * Returns basic analytics metrics for the authenticated vendor.
 * Uses aggregated queries (COUNT, AVG) to avoid N+1 queries.
 * 
 * Returns:
 * - bookings_count: Total number of bookings
 * - upcoming_bookings_count: Bookings with start_time in the future
 * - completed_bookings_count: Bookings with status = 'completed'
 * - average_rating: Average rating from reviews (nullable)
 */
export async function GET(request: NextRequest) {
  try {
    const config = getSupabaseConfig()
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
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
              // Ignore - setAll called from Route Handler
            }
          }
        }
      }
    )

    // Authenticate user from Authorization header or session cookie
    const authHeader = request.headers.get('authorization')
    let user
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const userResult = await supabase.auth.getUser(token)
      if (!userResult || userResult.error || !userResult.data?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = userResult.data.user
    } else {
      const sessionResult = await supabase.auth.getSession()
      if (!sessionResult || sessionResult.error || !sessionResult.data?.session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = sessionResult.data.session.user
    }

    // Get vendor profile - verify role is 'vendor'
    // Use service role client for queries after authentication to bypass RLS
    // (We've already validated the user, so this is safe)
    const supabaseAdmin = createSupabaseServerClient()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!profile || profile.role !== 'vendor') {
      return NextResponse.json({ error: 'Forbidden - Vendor access required' }, { status: 403 })
    }

    const vendorId = profile.id

    // Batch all queries in parallel to avoid N+1
    // Use aggregated queries for performance
    // Use service role client for queries (already authenticated user)
    const now = new Date().toISOString()

    // Get booking counts using aggregated queries
    // Batch all queries in parallel to avoid N+1
    const [bookingsResult, upcomingResult, completedResult, reviewsResult] = await Promise.all([
      // Total bookings count
      supabaseAdmin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', vendorId),
      
      // Upcoming bookings count (start_time > now)
      supabaseAdmin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', vendorId)
        .gt('start_time', now),
      
      // Completed bookings count
      supabaseAdmin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', vendorId)
        .eq('status', 'completed'),
      
      // Average rating from reviews (fetch all to calculate average)
      supabaseAdmin
        .from('reviews')
        .select('rating')
        .eq('provider_id', vendorId)
    ])

    if (bookingsResult.error) {
      console.error('Error fetching bookings:', bookingsResult.error)
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    // Calculate average rating from reviews
    let averageRating: number | null = null
    if (reviewsResult.data && reviewsResult.data.length > 0) {
      const sum = reviewsResult.data.reduce((acc, review) => acc + (review.rating || 0), 0)
      averageRating = sum / reviewsResult.data.length
    }

    return NextResponse.json({
      bookings_count: bookingsResult.count || 0,
      upcoming_bookings_count: upcomingResult.count || 0,
      completed_bookings_count: completedResult.count || 0,
      average_rating: averageRating
    })

  } catch (error) {
    console.error('Error in GET /api/vendor/analytics:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

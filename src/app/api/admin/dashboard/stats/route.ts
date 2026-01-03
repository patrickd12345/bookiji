import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { rateLimit } from '@/lib/ratelimit'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

/**
 * GET /api/admin/dashboard/stats
 * Returns dashboard statistics computed from database
 */
export async function GET(request: NextRequest) {
  try {
    const config = getSupabaseConfig()
    const cookieStore = await cookies()
    const authHeader = request.headers.get('authorization')
    
    let user: { id: string; email?: string } | null = null
    
    // Try Bearer token first
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const supabase = createSupabaseServerClient()
      const { data: { user: tokenUser }, error: authError } = await supabase.auth.getUser(token)
      if (!authError && tokenUser) {
        user = tokenUser
      }
    }
    
    // Fallback to cookie-based session
    if (!user) {
      const supabaseAuth = createServerClient(
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
      const { data: { user: cookieUser }, error: cookieError } = await supabaseAuth.auth.getUser()
      if (cookieError) {
        console.error('Cookie auth error:', cookieError)
      }
      if (cookieUser) {
        user = cookieUser
      }
    }
    
    if (!user) {
      console.error('No user found - authHeader:', !!authHeader, 'cookies:', cookieStore.getAll().length)
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    // Check admin access
    try {
      await requireAdmin({ user } as any)
    } catch (adminError) {
      console.error('Admin check failed:', adminError)
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Rate limiting
    const rateLimitKey = `admin:${user.email || user.id}:dashboard-stats`
    if (!rateLimit(rateLimitKey, 60, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const supabase = createSupabaseServerClient()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    // Get active users (users who have logged in or made bookings in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { count: activeUsersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .or('role.eq.customer,role.eq.vendor')

    // Get bookings today
    const { count: bookingsTodayCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString())

    // Get revenue (sum of total_amount from completed bookings)
    const { data: revenueData } = await supabase
      .from('bookings')
      .select('total_amount')
      .eq('status', 'completed')
    
    const revenue = revenueData?.reduce((sum, booking) => {
      const amount = typeof booking.total_amount === 'number' 
        ? booking.total_amount 
        : parseFloat(String(booking.total_amount || '0'))
      return sum + amount
    }, 0) || 0

    // Get error count from error_log (last 24 hours)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const { count: errorsCount } = await supabase
      .from('error_log')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', twentyFourHoursAgo.toISOString())

    return NextResponse.json({
      activeUsers: activeUsersCount || 0,
      bookingsToday: bookingsTodayCount || 0,
      revenue: Math.round(revenue), // Revenue in dollars (or cents if that's how it's stored)
      errors: errorsCount || 0
    })

  } catch (error) {
    console.error('Admin dashboard stats API error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

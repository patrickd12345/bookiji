import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { rateLimit } from '@/lib/ratelimit'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

interface ActivityItem {
  id: string
  type: 'vendor_registration' | 'booking_completed' | 'payment_received' | 'other'
  title: string
  description: string
  timestamp: string
  color: 'blue' | 'green' | 'yellow' | 'gray'
}

/**
 * GET /api/admin/dashboard/activity
 * Returns recent activity from audit_log and other sources
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
    const rateLimitKey = `admin:${user.email || user.id}:dashboard-activity`
    if (!rateLimit(rateLimitKey, 60, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const supabase = createSupabaseServerClient()
    const activities: ActivityItem[] = []

    // Get recent vendor registrations (profiles with role='vendor' created in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const { data: recentVendors } = await supabase
      .from('profiles')
      .select('id, full_name, business_name, created_at')
      .eq('role', 'vendor')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentVendors) {
      for (const vendor of recentVendors) {
        activities.push({
          id: vendor.id,
          type: 'vendor_registration',
          title: 'New vendor registration',
          description: `${vendor.business_name || vendor.full_name || 'A vendor'} joined the platform`,
          timestamp: vendor.created_at,
          color: 'blue'
        })
      }
    }

    // Get recent completed bookings
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('id, created_at, status, service_id')
      .eq('status', 'completed')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentBookings && recentBookings.length > 0) {
      // Get service names for bookings
      const serviceIds = recentBookings.map(b => b.service_id).filter(Boolean) as string[]
      let serviceMap: Record<string, string> = {}
      if (serviceIds.length > 0) {
        const { data: services } = await supabase
          .from('services')
          .select('id, name')
          .in('id', serviceIds)
        if (services) {
          serviceMap = services.reduce((acc, s) => {
            acc[s.id] = s.name
            return acc
          }, {} as Record<string, string>)
        }
      }

      for (const booking of recentBookings) {
        const serviceName = booking.service_id ? (serviceMap[booking.service_id] || 'service') : 'service'
        activities.push({
          id: booking.id,
          type: 'booking_completed',
          title: 'Booking completed',
          description: `${serviceName} completed`,
          timestamp: booking.created_at,
          color: 'green'
        })
      }
    }

    // Get recent payments (from bookings with status='completed')
    const { data: recentPayments } = await supabase
      .from('bookings')
      .select('id, created_at, total_amount, service_id')
      .eq('status', 'completed')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentPayments && recentPayments.length > 0) {
      // Get service names for payments
      const paymentServiceIds = recentPayments.map(p => p.service_id).filter(Boolean) as string[]
      let paymentServiceMap: Record<string, string> = {}
      if (paymentServiceIds.length > 0) {
        const { data: paymentServices } = await supabase
          .from('services')
          .select('id, name')
          .in('id', paymentServiceIds)
        if (paymentServices) {
          paymentServiceMap = paymentServices.reduce((acc, s) => {
            acc[s.id] = s.name
            return acc
          }, {} as Record<string, string>)
        }
      }

      for (const payment of recentPayments) {
        const serviceName = payment.service_id ? (paymentServiceMap[payment.service_id] || 'service') : 'service'
        const amount = typeof payment.total_amount === 'number' 
          ? payment.total_amount 
          : parseFloat(String(payment.total_amount || '0'))
        activities.push({
          id: payment.id,
          type: 'payment_received',
          title: 'Payment received',
          description: `$${amount.toFixed(2)} payment for ${serviceName}`,
          timestamp: payment.created_at,
          color: 'yellow'
        })
      }
    }

    // Sort by timestamp (most recent first) and limit to 10
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const recentActivities = activities.slice(0, 10).map(activity => ({
      ...activity,
      timeAgo: getTimeAgo(new Date(activity.timestamp))
    }))

    return NextResponse.json({
      activities: recentActivities
    })

  } catch (error) {
    console.error('Admin dashboard activity API error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

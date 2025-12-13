import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MetricsAI, BookingMetrics } from '@/lib/metrics/metricsAI'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /ops/metrics/bookings
 * 
 * Returns booking throughput metrics analysis
 * MetricsAI analyzes trends and detects anomalies
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '1h'
    const compareWith = searchParams.get('compareWith') // Optional: previous time range for comparison

    // Calculate time range
    const now = new Date()
    let startTime: Date
    let compareStartTime: Date | null = null

    switch (timeRange) {
      case '15m':
        startTime = new Date(now.getTime() - 15 * 60 * 1000)
        break
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
    }

    // If compareWith is provided, calculate previous period
    if (compareWith) {
      const duration = now.getTime() - startTime.getTime()
      compareStartTime = new Date(startTime.getTime() - duration)
    }

    // Fetch booking metrics grouped by 5-minute buckets
    // We'll aggregate from the bookings table
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, created_at, confirmed_at, cancelled_at, total_amount_cents, price_cents')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: true })

    if (bookingsError) {
      console.error('Failed to fetch bookings:', bookingsError)
      return NextResponse.json(
        { error: 'Failed to fetch booking metrics' },
        { status: 500 }
      )
    }

    // Group bookings into 5-minute buckets
    const bucketMap = new Map<string, {
      bookings_created: number
      bookings_confirmed: number
      bookings_cancelled: number
      bookings_completed: number
      total_revenue_cents: number
    }>()

    for (const booking of bookings || []) {
      const bucketTime = new Date(booking.created_at)
      bucketTime.setMinutes(Math.floor(bucketTime.getMinutes() / 5) * 5, 0, 0)
      const bucketKey = bucketTime.toISOString()

      if (!bucketMap.has(bucketKey)) {
        bucketMap.set(bucketKey, {
          bookings_created: 0,
          bookings_confirmed: 0,
          bookings_cancelled: 0,
          bookings_completed: 0,
          total_revenue_cents: 0
        })
      }

      const bucket = bucketMap.get(bucketKey)!
      bucket.bookings_created++

      const amount = booking.total_amount_cents || booking.price_cents || 0
      bucket.total_revenue_cents += amount

      if (booking.status === 'confirmed' || booking.confirmed_at) {
        bucket.bookings_confirmed++
      }
      if (booking.status === 'cancelled' || booking.cancelled_at) {
        bucket.bookings_cancelled++
      }
      if (booking.status === 'completed') {
        bucket.bookings_completed++
      }
    }

    // Convert to BookingMetrics array
    const bookingMetrics: BookingMetrics[] = Array.from(bucketMap.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        bookings_created: data.bookings_created,
        bookings_confirmed: data.bookings_confirmed,
        bookings_cancelled: data.bookings_cancelled,
        bookings_completed: data.bookings_completed,
        total_revenue_cents: data.total_revenue_cents,
        avg_booking_value_cents: data.bookings_created > 0
          ? data.total_revenue_cents / data.bookings_created
          : 0
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    // Fetch previous period if requested
    let previousMetrics: BookingMetrics[] | undefined
    if (compareStartTime && compareWith) {
      const { data: prevBookings } = await supabase
        .from('bookings')
        .select('id, status, created_at, confirmed_at, cancelled_at, total_amount_cents, price_cents')
        .gte('created_at', compareStartTime.toISOString())
        .lt('created_at', startTime.toISOString())
        .order('created_at', { ascending: true })

      const prevBucketMap = new Map<string, {
        bookings_created: number
        bookings_confirmed: number
        bookings_cancelled: number
        bookings_completed: number
        total_revenue_cents: number
      }>()

      for (const booking of prevBookings || []) {
        const bucketTime = new Date(booking.created_at)
        bucketTime.setMinutes(Math.floor(bucketTime.getMinutes() / 5) * 5, 0, 0)
        const bucketKey = bucketTime.toISOString()

        if (!prevBucketMap.has(bucketKey)) {
          prevBucketMap.set(bucketKey, {
            bookings_created: 0,
            bookings_confirmed: 0,
            bookings_cancelled: 0,
            bookings_completed: 0,
            total_revenue_cents: 0
          })
        }

        const bucket = prevBucketMap.get(bucketKey)!
        bucket.bookings_created++

        const amount = booking.total_amount_cents || booking.price_cents || 0
        bucket.total_revenue_cents += amount

        if (booking.status === 'confirmed' || booking.confirmed_at) {
          bucket.bookings_confirmed++
        }
        if (booking.status === 'cancelled' || booking.cancelled_at) {
          bucket.bookings_cancelled++
        }
        if (booking.status === 'completed') {
          bucket.bookings_completed++
        }
      }

      previousMetrics = Array.from(prevBucketMap.entries())
        .map(([timestamp, data]) => ({
          timestamp,
          bookings_created: data.bookings_created,
          bookings_confirmed: data.bookings_confirmed,
          bookings_cancelled: data.bookings_cancelled,
          bookings_completed: data.bookings_completed,
          total_revenue_cents: data.total_revenue_cents,
          avg_booking_value_cents: data.bookings_created > 0
            ? data.total_revenue_cents / data.bookings_created
            : 0
        }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    }

    // Analyze with MetricsAI
    const analysis = MetricsAI.analyzeBookingMetrics(bookingMetrics, previousMetrics)

    return NextResponse.json({
      success: true,
      analysis,
      raw_metrics: bookingMetrics,
      time_range: {
        start: startTime.toISOString(),
        end: now.toISOString(),
        duration: timeRange
      },
      comparison: compareWith ? {
        enabled: true,
        previous_range: compareStartTime ? {
          start: compareStartTime.toISOString(),
          end: startTime.toISOString()
        } : null
      } : { enabled: false }
    })

  } catch (error) {
    console.error('Booking metrics endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

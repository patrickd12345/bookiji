import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseClient'

const supabase = getServerSupabase()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('vendorId')
    const timeRange = searchParams.get('timeRange') || '30d'
    
    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID required' }, { status: 400 })
    }

    // Calculate date range
    const now = new Date()
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))

    // Fetch booking data for analytics
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services!inner(*)
      `)
      .eq('provider_id', vendorId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Analytics fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
    }

    // Calculate analytics metrics
    const analytics = calculateAnalytics(bookings || [])
    
    return NextResponse.json({
      success: true,
      analytics,
      timeRange,
      dataPoints: bookings?.length || 0
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface Booking {
  id: string
  status: string
  created_at: string
  slot_start?: string
  total_amount_cents?: number
  provider_id: string
  services?: {
    name: string
  }
}

function calculateAnalytics(bookings: Booking[]) {
  const totalBookings = bookings.length
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
  const completedBookings = bookings.filter(b => b.status === 'completed').length
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
  const pendingBookings = bookings.filter(b => b.status === 'pending').length

  const totalRevenue = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.total_amount_cents || 0), 0)

  const avgBookingValue = totalRevenue > 0 ? totalRevenue / Math.max(completedBookings, 1) : 0

  // Group by date for revenue over time
  const revenueByDate = bookings.reduce((acc, booking) => {
    const date = booking.created_at.split('T')[0]
    if (!acc[date]) {
      acc[date] = { amount: 0, bookings: 0 }
    }
    if (booking.status === 'completed') {
      acc[date].amount += booking.total_amount_cents || 0
    }
    acc[date].bookings += 1
    return acc
  }, {} as Record<string, { amount: number; bookings: number }>)

  const revenueOverTime = Object.entries(revenueByDate).map(([date, data]) => ({
    date,
    amount: Math.round((data as { amount: number; bookings: number }).amount / 100), // Convert to dollars
    bookings: (data as { amount: number; bookings: number }).bookings
  }))

  // Group by service
  const serviceStats = bookings.reduce((acc, booking) => {
    const serviceName = booking.services?.name || 'Unknown Service'
    if (!acc[serviceName]) {
      acc[serviceName] = { count: 0, revenue: 0 }
    }
    acc[serviceName].count += 1
    if (booking.status === 'completed') {
      acc[serviceName].revenue += booking.total_amount_cents || 0
    }
    return acc
  }, {} as Record<string, { count: number; revenue: number }>)

  const bookingsByService = Object.entries(serviceStats)
    .map(([service, data]) => ({
      service,
      count: (data as { count: number; revenue: number }).count,
      revenue: Math.round((data as { count: number; revenue: number }).revenue / 100) // Convert to dollars
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Group by hour for peak hours analysis
  const hourlyStats = bookings.reduce((acc, booking) => {
    const hour = new Date(booking.slot_start || booking.created_at).getHours()
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  const bookingsByTimeSlot = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 8 // 8 AM to 6 PM
    return {
      hour,
      count: hourlyStats[hour] || 0
    }
  })

  // Calculate status distribution
  const bookingsByStatus = [
    { status: 'Completed', count: completedBookings, percentage: Math.round((completedBookings / Math.max(totalBookings, 1)) * 100) },
    { status: 'Confirmed', count: confirmedBookings, percentage: Math.round((confirmedBookings / Math.max(totalBookings, 1)) * 100) },
    { status: 'Pending', count: pendingBookings, percentage: Math.round((pendingBookings / Math.max(totalBookings, 1)) * 100) },
    { status: 'Cancelled', count: cancelledBookings, percentage: Math.round((cancelledBookings / Math.max(totalBookings, 1)) * 100) }
  ]

  // Find best performing day
  const dayStats = bookings.reduce((acc, booking) => {
    const day = new Date(booking.created_at).toLocaleDateString('en-US', { weekday: 'long' })
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const bestPerformingDay = Object.entries(dayStats)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'Monday'

  const bestPerformingService = bookingsByService[0]?.service || 'No services yet'

  // Find busy hours (top 5 hours with most bookings)
  const busyHours = Object.entries(hourlyStats)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([hour]) => parseInt(hour))

  return {
    revenueOverTime,
    totalRevenue: Math.round(totalRevenue / 100), // Convert to dollars
    avgBookingValue: Math.round(avgBookingValue / 100), // Convert to dollars
    revenueGrowth: 0, // Would need historical data to calculate
    
    bookingsByStatus,
    bookingsByTimeSlot,
    bookingsByService,
    
    responseTime: 15, // Mock data - would calculate from actual response times
    noShowRate: Math.round((cancelledBookings / Math.max(totalBookings, 1)) * 100),
    rebookingRate: 45, // Mock data - would track repeat customers
    customerSatisfaction: 4.7, // Mock data - would calculate from reviews
    
    inquiryToBookingRate: Math.round((confirmedBookings / Math.max(totalBookings, 1)) * 100),
    commitmentFeeConversion: 92, // Mock data
    
    weeklyTrends: {
      bookings: totalBookings,
      revenue: Math.round(totalRevenue / 100),
      satisfaction: 4.7,
      change: 8.5 // Mock data
    },
    
    bestPerformingDay,
    bestPerformingService,
    busyHours
  }
} 
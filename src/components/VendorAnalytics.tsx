'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TooltipProps } from 'recharts'
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

interface AnalyticsData {
  revenue: {
    daily: number[]
    weekly: number[]
    monthly: number[]
  }
  bookings: {
    total: number
    completed: number
    cancelled: number
    upcoming: number
  }
  ratings: {
    average: number
    total: number
    distribution: number[]
  }
  popular_services: Array<{
    name: string
    bookings: number
    revenue: number
  }>
}

const CustomTooltip = ({ 
  active, 
  payload, 
  label 
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const value = payload[0].value as number;
    return (
      <div className="bg-white p-2 border rounded shadow">
        <p className="text-sm">{`${label}: ${value}`}</p>
      </div>
    );
  }
  return null;
};

export default function VendorAnalytics() {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session found')

      // Get basic booking stats
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, price_cents, created_at')
        .eq('provider_id', session.user.id)

      if (bookingsError) throw bookingsError

      // Get ratings
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', session.user.id)

      if (reviewsError) throw reviewsError

      // Get popular services
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select(`
          name,
          bookings:bookings(
            id,
            price_cents
          )
        `)
        .eq('provider_id', session.user.id)

      if (servicesError) throw servicesError

      // Calculate revenue over time
      const now = new Date()
      const timeframeData = calculateTimeframeData(bookings || [], timeframe, now)

      // Calculate booking stats
      const bookingStats = {
        total: bookings?.length || 0,
        completed: bookings?.filter(b => b.status === 'completed').length || 0,
        cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
        upcoming: bookings?.filter(b => b.status === 'upcoming').length || 0
      }

      // Calculate rating stats
      const ratings = reviews || []
      const ratingStats = {
        average: ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
          : 0,
        total: ratings.length,
        distribution: Array(5).fill(0).map((_, i) => 
          ratings.filter(r => r.rating === i + 1).length
        )
      }

      // Calculate popular services
      const popularServices = (services || []).map(service => ({
        name: service.name,
        bookings: service.bookings?.length || 0,
        revenue: service.bookings?.reduce((sum, b) => sum + (b.price_cents || 0), 0) || 0
      })).sort((a, b) => b.bookings - a.bookings).slice(0, 5)

      setAnalyticsData({
        revenue: timeframeData,
        bookings: bookingStats,
        ratings: ratingStats,
        popular_services: popularServices
      })
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError('Failed to load analytics data')
      setAnalyticsData(null)
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const calculateTimeframeData = (
    bookings: Array<{ created_at: string; price_cents: number }>,
    timeframe: 'daily' | 'weekly' | 'monthly',
    now: Date
  ) => {
    const result = {
      daily: new Array(30).fill(0),
      weekly: new Array(12).fill(0),
      monthly: new Array(12).fill(0)
    }

    bookings.forEach(booking => {
      const date = new Date(booking.created_at)
      const dayDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      const weekDiff = Math.floor(dayDiff / 7)
      const monthDiff = (now.getMonth() - date.getMonth() + (now.getFullYear() - date.getFullYear()) * 12)

      if (dayDiff < 30) result.daily[29 - dayDiff] += booking.price_cents || 0
      if (weekDiff < 12) result.weekly[11 - weekDiff] += booking.price_cents || 0
      if (monthDiff < 12) result.monthly[11 - monthDiff] += booking.price_cents || 0
    })

    return result
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  }

  if (error) {
    return <div className="text-red-600 p-4">{error}</div>
  }

  if (!analyticsData) {
    return <div className="text-gray-600 p-4">No analytics data available</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as 'daily' | 'weekly' | 'monthly')}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="daily">Last 30 Days</option>
          <option value="weekly">Last 12 Weeks</option>
          <option value="monthly">Last 12 Months</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Bookings</h3>
          <p className="text-3xl">{analyticsData.bookings.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Completed</h3>
          <p className="text-3xl text-green-600">{analyticsData.bookings.completed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Upcoming</h3>
          <p className="text-3xl text-blue-600">{analyticsData.bookings.upcoming}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Average Rating</h3>
          <p className="text-3xl text-yellow-500">
            {analyticsData.ratings.average.toFixed(1)} ⭐
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Revenue Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analyticsData.revenue[timeframe].map((value, index) => ({
              name: index.toString(),
              value: value / 100 // Convert cents to dollars
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" stroke="#4F46E5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Popular Services</h3>
          <div className="space-y-4">
            {analyticsData.popular_services.map((service, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>{service.name}</span>
                <span className="text-gray-600">{service.bookings} bookings</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
          <div className="space-y-2">
            {analyticsData.ratings.distribution.map((count, index) => (
              <div key={index} className="flex items-center">
                <span className="w-16">{index + 1} ⭐</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400"
                    style={{
                      width: `${(count / analyticsData.ratings.total * 100) || 0}%`
                    }}
                  />
                </div>
                <span className="w-16 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 
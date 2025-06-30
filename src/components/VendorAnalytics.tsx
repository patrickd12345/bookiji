'use client'

import { useState, useEffect } from 'react'

interface AnalyticsData {
  revenue: {
    total: number
    thisWeek: number
    thisMonth: number
    change: number
  }
  bookings: {
    total: number
    thisWeek: number
    pending: number
    confirmed: number
    completed: number
    cancelled: number
  }
  performance: {
    avgBookingValue: number
    responseTime: number
    customerRating: number
    noShowRate: number
  }
  chartData: Array<{
    date: string
    revenue: number
    bookings: number
  }>
  topServices: Array<{
    name: string
    revenue: number
    bookings: number
    rating: number
  }>
  peakHours: Array<{
    hour: number
    bookings: number
    revenue: number
  }>
}

interface VendorAnalyticsProps {
  timeRange?: '7d' | '30d' | '90d' | '1y'
}

export default function VendorAnalytics({ timeRange = '30d' }: VendorAnalyticsProps) {
  const [selectedRange, setSelectedRange] = useState(timeRange)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Mock data for demonstration
  const mockData: AnalyticsData = {
    revenue: {
      total: 12450,
      thisWeek: 2340,
      thisMonth: 8920,
      change: 15.3
    },
    bookings: {
      total: 156,
      thisWeek: 28,
      pending: 5,
      confirmed: 12,
      completed: 134,
      cancelled: 5
    },
    performance: {
      avgBookingValue: 79.80,
      responseTime: 1.2,
      customerRating: 4.8,
      noShowRate: 2.1
    },
    chartData: [
      { date: '2024-01-01', revenue: 450, bookings: 6 },
      { date: '2024-01-02', revenue: 680, bookings: 9 },
      { date: '2024-01-03', revenue: 320, bookings: 4 },
      { date: '2024-01-04', revenue: 890, bookings: 11 },
      { date: '2024-01-05', revenue: 560, bookings: 7 },
      { date: '2024-01-06', revenue: 720, bookings: 9 },
      { date: '2024-01-07', revenue: 410, bookings: 5 }
    ],
    topServices: [
      { name: 'Premium Haircut', revenue: 3200, bookings: 40, rating: 4.9 },
      { name: 'Hair Styling', revenue: 2800, bookings: 35, rating: 4.7 },
      { name: 'Hair Coloring', revenue: 2100, bookings: 21, rating: 4.8 },
      { name: 'Beard Trim', revenue: 1600, bookings: 32, rating: 4.6 }
    ],
    peakHours: [
      { hour: 9, bookings: 12, revenue: 960 },
      { hour: 10, bookings: 18, revenue: 1440 },
      { hour: 11, bookings: 15, revenue: 1200 },
      { hour: 14, bookings: 22, revenue: 1760 },
      { hour: 15, bookings: 20, revenue: 1600 },
      { hour: 16, bookings: 16, revenue: 1280 },
      { hour: 17, bookings: 14, revenue: 1120 }
    ]
  }

  useEffect(() => {
    // Simulate API call
    const fetchAnalytics = async () => {
      setLoading(true)
      // In real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setAnalyticsData(mockData)
      setLoading(false)
    }

    fetchAnalytics()
  }, [selectedRange])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!analyticsData) return null

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
          <p className="text-gray-600">Track your business growth and optimize performance</p>
        </div>
        
        <select
          value={selectedRange}
          onChange={(e) => setSelectedRange(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {timeRangeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">${analyticsData.revenue.total.toLocaleString()}</div>
          <div className="flex items-center mt-2">
            <span className={`text-sm ${analyticsData.revenue.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analyticsData.revenue.change >= 0 ? '↗' : '↘'} {Math.abs(analyticsData.revenue.change)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">vs last period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Avg Booking Value</h3>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">${analyticsData.performance.avgBookingValue}</div>
          <div className="text-sm text-gray-500 mt-2">Per appointment</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Response Time</h3>
            <span className="text-2xl">⚡</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{analyticsData.performance.responseTime}h</div>
          <div className="text-sm text-green-600 mt-2">Excellent response</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Customer Rating</h3>
            <span className="text-2xl">⭐</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{analyticsData.performance.customerRating}/5.0</div>
          <div className="text-sm text-green-600 mt-2">Above average</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6 border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
        <div className="h-64 flex items-end justify-between space-x-2">
          {analyticsData.chartData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-gradient-to-t from-blue-500 to-purple-600 rounded-t-sm hover:opacity-80 transition-opacity cursor-pointer"
                style={{ height: `${(data.revenue / 1000) * 100}%` }}
                title={`$${data.revenue} revenue`}
              ></div>
              <div className="text-xs text-gray-500 mt-2">
                {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Status & Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completed</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '86%' }}></div>
                </div>
                <span className="text-sm font-medium">{analyticsData.bookings.completed}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Confirmed</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '8%' }}></div>
                </div>
                <span className="text-sm font-medium">{analyticsData.bookings.confirmed}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Pending</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '3%' }}></div>
                </div>
                <span className="text-sm font-medium">{analyticsData.bookings.pending}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Cancelled</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '3%' }}></div>
                </div>
                <span className="text-sm font-medium">{analyticsData.bookings.cancelled}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Hours</h3>
          <div className="space-y-2">
            {analyticsData.peakHours.map((hour, index) => (
              <div key={hour.hour} className="flex items-center justify-between py-1">
                <span className="text-gray-600">
                  {hour.hour}:00 {hour.bookings > 18 ? '🔥' : ''}
                </span>
                <div className="flex items-center space-x-3">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full"
                      style={{ width: `${(hour.bookings / 25) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-8">{hour.bookings}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service Performance */}
      <div className="bg-white rounded-lg shadow-sm p-6 border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Service</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Revenue</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Bookings</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Rating</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData.topServices.map((service, index) => (
                <tr key={service.name} className="border-b border-gray-100">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {index === 0 && <span className="text-yellow-500">👑</span>}
                      <span className="font-medium">{service.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold">${service.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4">{service.bookings}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1">
                      <span>⭐</span>
                      <span>{service.rating}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.rating >= 4.8 ? 'bg-green-100 text-green-800' :
                      service.rating >= 4.5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {service.rating >= 4.8 ? 'Excellent' : service.rating >= 4.5 ? 'Good' : 'Average'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">AI Insights & Recommendations</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <p className="text-purple-700">
                  Your 2-4 PM slot shows highest revenue potential. Consider promoting premium services during these hours.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">💡</span>
                <p className="text-purple-700">
                  Customer rating is excellent (4.8/5). You could increase prices by 10-15% while maintaining demand.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-orange-600 mt-0.5">⚠</span>
                <p className="text-purple-700">
                  Response time of 1.2h is good, but reducing to under 1h could increase booking conversion by 23%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
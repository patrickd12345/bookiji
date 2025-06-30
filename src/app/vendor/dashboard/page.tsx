'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { VendorCalendar, VendorAnalytics, GuidedTourManager } from '@/components'

interface BookingStats {
  totalBookings: number
  confirmedBookings: number
  pendingBookings: number
  totalRevenue: number
  thisWeekBookings: number
  noShowRate: number
  avgRating: number
}

interface RecentBooking {
  id: string
  customer_name: string
  service_name: string
  slot_start: string
  status: string
  total_amount_cents: number
  commitment_fee_paid: boolean
}

export default function VendorDashboard() {
  const [stats, setStats] = useState<BookingStats>({
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    thisWeekBookings: 0,
    noShowRate: 0,
    avgRating: 0
  })
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'calendar' | 'analytics'>('overview')

  // Mock vendor ID - in real app, get from auth
  const vendorId = 'vendor_1'

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch booking statistics
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          customers!bookings_customer_id_fkey(full_name),
          services!bookings_service_id_fkey(name)
        `)
        .eq('vendor_id', vendorId)

      if (bookings) {
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        
        const totalBookings = bookings.length
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
        const pendingBookings = bookings.filter(b => b.status === 'pending').length
        const totalRevenue = bookings
          .filter(b => b.commitment_fee_paid)
          .reduce((sum, b) => sum + b.total_amount_cents, 0)
        const thisWeekBookings = bookings
          .filter(b => new Date(b.created_at) > weekAgo).length
        const noShowCount = bookings.filter(b => b.status === 'no-show').length
        const noShowRate = totalBookings > 0 ? (noShowCount / totalBookings) * 100 : 0

        setStats({
          totalBookings,
          confirmedBookings,
          pendingBookings,
          totalRevenue,
          thisWeekBookings,
          noShowRate,
          avgRating: 4.8 // Mock rating
        })

        // Recent bookings
        const recent = bookings
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(b => ({
            id: b.id,
            customer_name: b.customers?.full_name || 'Unknown',
            service_name: b.services?.name || 'Unknown Service',
            slot_start: b.slot_start,
            status: b.status,
            total_amount_cents: b.total_amount_cents,
            commitment_fee_paid: b.commitment_fee_paid
          }))

        setRecentBookings(recent)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, subtitle, icon, color = 'blue' }: {
    title: string
    value: string | number
    subtitle?: string
    icon: string
    color?: string
  }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`text-3xl opacity-80`}>{icon}</div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
              <p className="text-gray-600">Manage your bookings and track performance</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right" data-tour="revenue-overview">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold text-green-600">
                  ${(stats.totalRevenue / 100).toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                P
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'bookings', name: 'Bookings', icon: '📅' },
              { id: 'calendar', name: 'Calendar', icon: '🗓️' },
              { id: 'analytics', name: 'Analytics', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-tour={tab.id === 'calendar' ? 'calendar-tab' : tab.id === 'analytics' ? 'analytics-tab' : undefined}
              >
                {tab.icon} {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Bookings"
                value={stats.totalBookings}
                subtitle="All time"
                icon="📋"
                color="blue"
              />
              <StatCard
                title="This Week"
                value={stats.thisWeekBookings}
                subtitle="New bookings"
                icon="📈"
                color="green"
              />
              <StatCard
                title="No-Show Rate"
                value={`${stats.noShowRate.toFixed(1)}%`}
                subtitle="Lower is better"
                icon="⚠️"
                color={stats.noShowRate < 5 ? 'green' : 'red'}
              />
              <StatCard
                title="Average Rating"
                value={stats.avgRating}
                subtitle="Customer satisfaction"
                icon="⭐"
                color="yellow"
              />
            </div>

            {/* No Wasted Leads Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white" data-tour="no-show-guarantee">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">🎯 No Wasted Leads Guarantee</h3>
                  <p className="text-blue-100">
                    Every booking comes with a $1 commitment fee - ensuring serious customers only.
                  </p>
                  <p className="text-blue-100 mt-1">
                    <strong>{stats.confirmedBookings}</strong> confirmed bookings • 
                    <strong> {((stats.confirmedBookings / Math.max(stats.totalBookings, 1)) * 100).toFixed(1)}%</strong> success rate
                  </p>
                </div>
                <div className="text-4xl opacity-80">🚀</div>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-lg shadow-sm" data-tour="recent-bookings">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Recent Bookings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{booking.customer_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {booking.service_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {new Date(booking.slot_start).toLocaleDateString()}
                          <br />
                          <span className="text-sm text-gray-500">
                            {new Date(booking.slot_start).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            booking.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">
                            ${(booking.total_amount_cents / 100).toFixed(2)}
                          </div>
                          {booking.commitment_fee_paid && (
                            <div className="text-xs text-green-600">✓ Paid</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <VendorCalendar />
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">All Bookings</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600">Detailed booking management interface coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <VendorAnalytics />
        )}
      </div>
      
      <GuidedTourManager type="vendor" />
    </div>
  )
} 
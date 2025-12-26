'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { VendorCalendar, VendorAnalytics, GuidedTourManager } from '@/components'
import { SubscriptionManager } from '@/components/SubscriptionManager'
import VendorMetricsDashboard from '@/components/VendorMetricsDashboard'
import { registerTour } from '@/lib/guidedTourRegistry'
import { useAutoTour } from '@/lib/useAutoTour'

interface BookingStats {
  totalBookings: number
  confirmedBookings: number
  pendingBookings: number
  thisWeekBookings: number
  avgRating: number
}

interface RecentBooking {
  id: string
  customer_name: string
  service_name: string
  slot_start: string
  status: string
}

export default function VendorDashboard() {
  const [stats, setStats] = useState<BookingStats>({
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    thisWeekBookings: 0,
    avgRating: 0
  })
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'calendar' | 'analytics'>('overview')
  const [pendingServiceTypes, setPendingServiceTypes] = useState<number>(0)

  const [vendorId, setVendorId] = useState<string>('')

  useEffect(() => {
    fetchDashboardData()
    loadPendingProposals()
    registerTour({
      id: 'vendor-pending-service-type',
      route: '/vendor/dashboard',
      title: 'Pending Service Type Approval',
      steps: [
        { target: '[data-tour="pending-service-badge"]', content: 'This badge shows how many of your custom service type proposals are awaiting approval.' }
      ]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useAutoTour()

  const fetchDashboardData = async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    try {
      setLoading(true)
      
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      
      // Get vendor profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('role', 'vendor')
        .single()
      
      if (!profile) {
        setLoading(false)
        return
      }
      
      const currentVendorId = profile.id
      setVendorId(currentVendorId)
      
      // Fetch booking statistics
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          customers!bookings_customer_id_fkey(full_name),
          services!bookings_service_id_fkey(name)
        `)
        .eq('vendor_id', currentVendorId)

      if (bookings) {
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        
        const totalBookings = bookings.length
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
        const pendingBookings = bookings.filter(b => b.status === 'pending').length
        const thisWeekBookings = bookings
          .filter(b => new Date(b.created_at) > weekAgo).length

        setStats({
          totalBookings,
          confirmedBookings,
          pendingBookings,
          thisWeekBookings,
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
            status: b.status
          }))

        setRecentBookings(recent)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPendingProposals = async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    try {
      const { data, error } = await supabase
        .from('service_type_proposals')
        .select('id')
        .eq('vendor_id', vendorId || '')
        .eq('status', 'pending')

      if (!error) setPendingServiceTypes(data.length)
    } catch (e) {
      console.error('Pending proposals fetch error', e)
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
              <div className="relative">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  P
                </div>
                {pendingServiceTypes > 0 && (
                  <span data-tour="pending-service-badge" className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-yellow-500 px-1.5 text-[10px] font-semibold leading-none text-white">
                    {pendingServiceTypes}
                  </span>
                )}
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
                onClick={() => setActiveTab(tab.id as 'overview' | 'bookings' | 'calendar' | 'analytics')}
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
        <SubscriptionManager />
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Decision-Informing Metrics */}
            {vendorId && <VendorMetricsDashboard vendorId={vendorId} />}
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="booking-stats">
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
                title="Pending Bookings"
                value={stats.pendingBookings}
                subtitle="Awaiting confirmation"
                icon="?"
                color="yellow"
              />
              <StatCard
                title="Avg Rating"
                value={stats.avgRating}
                subtitle="Customer satisfaction"
                icon="⭐"
                color="yellow"
              />
            </div>

            {
/* Recent Bookings */}
            <div className="bg-white rounded-lg shadow-sm p-6" data-tour="recent-bookings">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{booking.customer_name}</p>
                      <p className="text-sm text-gray-600">{booking.service_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(booking.slot_start).toLocaleDateString()} at{' '}
                        {new Date(booking.slot_start).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6">
            {/* Calendar Choice Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="text-2xl">📅</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Choose Your Calendar System</h3>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">🏠 Native Bookiji Calendar</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Built-in calendar system. Perfect for getting started quickly.
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>✓ Simple setup</li>
                        <li>✓ No external dependencies</li>
                        <li>✓ Integrated with booking system</li>
                      </ul>
                    </div>
                    <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">🔗 Google Calendar Sync</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Sync with your existing Google Calendar for unified scheduling.
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>✓ Uses your existing calendar</li>
                        <li>✓ Real-time sync</li>
                        <li>✓ Works with mobile apps</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-700">
                      <strong>Choose one:</strong> Either use the native calendar below OR set up Google Calendar sync.
                    </p>
                    <Link href="/vendor/schedule" className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                      🔗 Set Up Google Calendar
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Native Calendar */}
          <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Native Bookiji Calendar</h3>
                <span className="text-sm text-gray-500">Use this OR Google Calendar sync (not both)</span>
              </div>
            <VendorCalendar />
            </div>
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

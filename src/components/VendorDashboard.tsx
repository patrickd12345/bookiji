'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { useAsyncData } from '@/hooks/useAsyncState'
import { LoadingSpinner, PageLoader, CardLoader } from '@/components/ui/LoadingSpinner'
import { ErrorDisplay, NetworkError } from '@/components/ui/ErrorDisplay'
import { StatusMessage, SuccessMessage } from '@/components/ui/StatusMessage'
import { DataWrapper, APIWrapper } from '@/components/ui/AsyncWrapper'
import {
  Calendar,
  Clock,
  MapPin, 
  Star, 
  TrendingUp, 
  Users, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGuidedTour } from '@/components/guided-tours/GuidedTourProvider'
import { vendorDashboardSteps, vendorDashboardTourId } from '@/tours/dashboardNavigation'

interface VendorStats {
  totalBookings: number
  completedBookings: number
  pendingBookings: number
  cancelledBookings: number
  totalRevenue: number
  averageRating: number
  totalReviews: number
  activeServices: number
}

interface RecentBooking {
  id: string
  customer_name: string
  service_name: string
  scheduled_for: string
  status: string
  price_cents: number
  customer_rating?: number
  customer_review?: string
}

interface VendorProfile {
  id: string
  business_name: string
  email: string
  phone?: string
  avatar_url?: string
  rating: number
  total_reviews: number
  specialties: string[]
  location: {
    lat: number
    lng: number
    address?: string
  }
  is_verified: boolean
  member_since: string
}

export default function VendorDashboard() {
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null)
  const [stats, setStats] = useState<VendorStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])

  // Use the new async data hooks
  const profileData = useAsyncData<VendorProfile>()
  const statsData = useAsyncData<VendorStats>()
  const bookingsData = useAsyncData<RecentBooking[]>()
  const { startTour, hasCompletedTour } = useGuidedTour()

  // Load vendor profile
  const loadVendorProfile = useCallback(async () => {
    try {
      const result = await profileData.fetch(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          throw new Error('No authenticated user')
        }

        const { data, error } = await supabase
          .from('user_role_summary')
          .select('*, profiles(*)')
          .eq('user_id', session.user.id)
          .eq('role', 'vendor')
          .single()

        if (error) throw error

        return {
          id: data.user_id,
          business_name: data.profiles?.business_name || 'My Business',
          email: data.profiles?.email || session.user.email || '',
          phone: data.profiles?.phone,
          avatar_url: data.profiles?.avatar_url,
          rating: data.profiles?.rating || 0,
          total_reviews: data.profiles?.total_reviews || 0,
          specialties: data.profiles?.specialties || [],
          location: data.profiles?.location || { lat: 0, lng: 0 },
          is_verified: data.profiles?.is_verified || false,
          member_since: data.profiles?.created_at || new Date().toISOString()
        }
      })

      if (result.success && result.data) {
        setVendorProfile(result.data)
        setVendorId(result.data.id)
      }
    } catch (error) {
      console.error('Failed to load vendor profile:', error)
    }
  }, [profileData])

  // Load vendor statistics
  const loadVendorStats = useCallback(async () => {
    if (!vendorId) return

    try {
      const result = await statsData.fetch(async () => {
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('vendor_id', vendorId)

        if (error) throw error

        const totalBookings = bookings.length
        const completedBookings = bookings.filter(b => b.status === 'completed').length
        const pendingBookings = bookings.filter(b => b.status === 'pending').length
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
        const totalRevenue = bookings.reduce((sum, b) => sum + (b.price_cents || 0), 0)
        
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('vendor_id', vendorId)

        const averageRating = reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0

        const { data: services } = await supabase
          .from('services')
          .select('id')
          .eq('vendor_id', vendorId)
          .eq('is_active', true)

        return {
          totalBookings,
          completedBookings,
          pendingBookings,
          cancelledBookings,
          totalRevenue,
          averageRating: Number(averageRating.toFixed(1)),
          totalReviews: reviews?.length || 0,
          activeServices: services?.length || 0
        }
      })

      if (result.success && result.data) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Failed to load vendor stats:', error)
    }
  }, [vendorId, statsData])

  // Load recent bookings
  const loadRecentBookings = useCallback(async () => {
    if (!vendorId) return

    try {
      const result = await bookingsData.fetch(async () => {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) throw error

        return data.map(booking => ({
          id: booking.id,
          customer_name: booking.customer_name || 'Anonymous',
          service_name: booking.service_name,
          scheduled_for: booking.scheduled_for,
          status: booking.status,
          price_cents: booking.price_cents || 0,
          customer_rating: booking.customer_rating,
          customer_review: booking.customer_review
        }))
      })

      if (result.success && result.data) {
        setRecentBookings(result.data)
      }
    } catch (error) {
      console.error('Failed to load recent bookings:', error)
    }
  }, [vendorId, bookingsData])

  // Load data on mount and when vendorId changes
  useEffect(() => {
    loadVendorProfile()
  }, [loadVendorProfile])

  useEffect(() => {
    if (vendorId) {
      loadVendorStats()
      loadRecentBookings()
    }
  }, [vendorId, loadVendorStats, loadRecentBookings])

  useEffect(() => {
    if (!hasCompletedTour(vendorDashboardTourId)) {
      startTour(vendorDashboardTourId, vendorDashboardSteps)
    }
  }, [hasCompletedTour, startTour])

  // Helper functions
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'cancelled':
        return <XCircle className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  // Show loading state while profile is loading
  if (profileData.loading && !vendorProfile) {
    return <PageLoader text="Loading your dashboard..." />
  }

  // Show error state if profile loading failed
  if (profileData.error && !vendorProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <NetworkError 
          error={profileData.error}
          onRetry={loadVendorProfile}
        />
      </div>
    )
  }

  if (!vendorProfile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {vendorProfile.business_name}! 👋
              </h1>
              <p className="mt-1 text-gray-600">
                Manage your services, bookings, and grow your business
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {vendorProfile.is_verified && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                <Star className="w-4 h-4" />
                {vendorProfile.rating} ({vendorProfile.total_reviews} reviews)
              </div>

              <button
                className="px-3 py-1 border rounded text-sm text-gray-700"
                data-tour="settings-menu"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        {statsData.error && (
          <NetworkError 
            error={statsData.error} 
            onRetry={loadVendorStats}
            className="mb-6"
          />
        )}
        
        {bookingsData.error && (
          <NetworkError 
            error={bookingsData.error} 
            onRetry={loadRecentBookings}
            className="mb-6"
          />
        )}

        {/* Statistics Grid */}
        <DataWrapper
          data={stats}
          loading={statsData.loading}
          error={statsData.error}
          onRetry={loadVendorStats}
          loadingText="Loading statistics..."
          emptyState={
            <div className="text-center py-8">
              <p className="text-gray-500">No statistics available yet</p>
            </div>
          }
          className="mb-8"
        >
          {(stats) => (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="stats-cards">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Bookings</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Rating</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.averageRating}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Services</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.activeServices}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </DataWrapper>

        {/* Recent Bookings */}
        <DataWrapper
          data={recentBookings}
          loading={bookingsData.loading}
          error={bookingsData.error}
          onRetry={loadRecentBookings}
          loadingText="Loading recent bookings..."
          emptyState={
            <div className="text-center py-8">
              <p className="text-gray-500">No bookings yet</p>
            </div>
          }
          className="mb-8"
        >
          {(bookings) => (
            <div className="bg-white rounded-lg shadow-sm border" data-tour="recent-bookings">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Recent Bookings</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {bookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-gray-900">{booking.customer_name}</h3>
                          <p className="text-sm text-gray-600">{booking.service_name}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(booking.scheduled_for)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(booking.scheduled_for).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                            getStatusColor(booking.status)
                          )}>
                            {getStatusIcon(booking.status)}
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </div>
                        
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(booking.price_cents)}
                        </p>
                        
                        {booking.customer_rating && (
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  'w-3 h-3',
                                  i < booking.customer_rating! 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-300'
                                )}
                              />
                            ))}
                            <span className="text-xs text-gray-500 ml-1">
                              ({booking.customer_rating})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {booking.customer_review && (
                      <div className="mt-3 pl-14">
                        <p className="text-sm text-gray-600 italic">
                          "{booking.customer_review}"
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </DataWrapper>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-tour="quick-actions">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Manage Schedule</h3>
              <p className="text-sm text-gray-600">Update your availability and time slots</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Add Services</h3>
              <p className="text-sm text-gray-600">Create new service offerings</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Update Profile</h3>
              <p className="text-sm text-gray-600">Edit business information and location</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

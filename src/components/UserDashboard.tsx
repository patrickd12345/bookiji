'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { NotificationResponse, NotificationError } from '@/types/notification'
import { 
  User, 
  Calendar, 
  MapPin, 
  Star, 
  Coins,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Shield,
  Award,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { NetworkError } from '@/components/ui/ErrorDisplay'
import { SuccessMessage } from '@/components/ui/StatusMessage'
import { useAsyncData } from '@/hooks/useAsyncState'
import { cn } from '@/lib/utils'
import { useGuidedTour } from '@/components/guided-tours/GuidedTourProvider'
import { customerDashboardSteps, customerDashboardTourId } from '@/tours/dashboardNavigation'

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  member_since: string
  verification_status: 'verified' | 'pending' | 'unverified'
  preferences: {
    notifications: boolean
    marketing_emails: boolean
    sms_alerts: boolean
  }
  stats: {
    total_bookings: number
    total_spent_cents: number
    favorite_providers: number
    average_rating_given: number
  }
}

interface Booking {
  id: string
  service_name: string
  provider_name: string
  provider_avatar?: string
  date: string
  time: string
  duration_minutes: number
  status: 'upcoming' | 'completed' | 'cancelled'
  price_cents: number
  location: string
  notes?: string
  rating?: number
  review?: string
}

interface CreditBalance {
  balance_cents: number
  balance_dollars: number
  recent_transactions: CreditTransaction[]
}

interface CreditTransaction {
  id: string
  amount_cents: number
  type: 'purchase' | 'usage' | 'refund' | 'bonus'
  description: string
  date: string
}



interface Provider {
  id: string;
  business_name: string;
  avatar_url: string;
  rating: number;
  total_reviews: number;
  specialties: string[];
  distance?: number;
  last_booked?: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'credits' | 'favorites' | 'profile'>('overview')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [favoriteProviders, setFavoriteProviders] = useState<Provider[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all')
  const router = useRouter()
  const { startTour, hasCompletedTour } = useGuidedTour()

  // Use the new async state hook for notifications
  const notifications = useAsyncData<NotificationResponse['notifications']>({
    autoReset: true,
    resetDelay: 5000
  })

  const loadNotifications = useCallback(async (): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/notifications', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined
      })
      if (!response.ok) {
        const errorData = await response.json() as NotificationError
        throw new Error(errorData.error || 'Failed to fetch notifications')
      }
      
      const data = await response.json() as NotificationResponse
      notifications.setData(data.notifications)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      notifications.setError(error instanceof Error ? error.message : 'Failed to load notifications')
    }
  }, [notifications])

  // Load user data (profile, bookings, credits, favorites) in parallel
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.push('/login')
          return
        }

        // Load all data in parallel
        const [profileResult, bookingsResult, creditsResult, favoritesResult] = await Promise.allSettled([
          supabase
            .from('user_role_summary')
            .select('*, beta_status')
            .eq('user_id', session.user.id)
            .maybeSingle(),
          supabase
            .from('bookings')
            .select('*')
            .eq('customer_id', session.user.id)
            .order('created_at', { ascending: false }),
          fetch('/api/credits/balance').then(res => res.ok ? res.json() : null),
          supabase
            .from('favorite_providers')
            .select('provider_id, providers(*)')
            .eq('user_id', session.user.id)
        ])

        // Handle profile
        if (profileResult.status === 'fulfilled' && profileResult.value.data) {
          setUserProfile(profileResult.value.data as UserProfile)
        }

        // Handle bookings
        if (bookingsResult.status === 'fulfilled' && bookingsResult.value.data) {
          setBookings(bookingsResult.value.data as Booking[])
        }

        // Handle credits
        if (creditsResult.status === 'fulfilled' && creditsResult.value?.success) {
          setCredits(creditsResult.value.credits)
        }

        // Handle favorites
        if (favoritesResult.status === 'fulfilled' && favoritesResult.value.data) {
          const providers = favoritesResult.value.data
            .map(fp => fp.providers)
            .filter(Boolean) as unknown as Provider[]
          setFavoriteProviders(providers)
        }

        // Load notifications
        loadNotifications()
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }

    loadUserData()
  }, [router, loadNotifications])

  useEffect(() => {
    if (!hasCompletedTour(customerDashboardTourId)) {
      startTour(customerDashboardTourId, customerDashboardSteps)
    }
  }, [hasCompletedTour, startTour])

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (cents: number) => {
    return `$${(Math.abs(cents) / 100).toFixed(2)}`
  }

  if (!userProfile) {
    return <PageLoader text="Loading your dashboard..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div data-tour="dashboard-welcome">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {userProfile.name.split(' ')[0]}! 👋
              </h1>
              <p className="mt-1 text-gray-600">
                Manage your bookings, credits, and favorite providers
              </p>
            </div>
            
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={loadNotifications}
                className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={notifications.loading}
              >
                <span className="text-2xl">🔔</span>
                {notifications.data && notifications.data.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.data.length}
                  </span>
                )}
              </button>
              
              {/* Notifications dropdown */}
              {notifications.data && notifications.data.length > 0 && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-10">
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Recent Notifications</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {notifications.data.slice(0, 5).map((notification, index) => (
                        <div key={index} className="text-sm text-gray-600 p-2 hover:bg-gray-50 rounded">
                          {notification.message}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        {notifications.error && (
          <NetworkError 
            error={notifications.error} 
            onRetry={loadNotifications}
            className="mb-6"
          />
        )}
        
        {notifications.success && (
          <SuccessMessage 
            message="Notifications loaded successfully"
            className="mb-6"
            autoDismiss
          />
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'bookings', label: 'Bookings', icon: '📅' },
                { id: 'credits', label: 'Credits', icon: '💰' },
                { id: 'favorites', label: 'Favorites', icon: '❤️' },
                { id: 'profile', label: 'Profile', icon: '👤' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2',
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100">Total Bookings</p>
                        <p className="text-3xl font-bold">{bookings.length}</p>
                      </div>
                      <span className="text-4xl">📅</span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100">Credits Balance</p>
                        <p className="text-3xl font-bold">
                          ${credits ? (credits.balance_cents / 100).toFixed(2) : '0.00'}
                        </p>
                      </div>
                      <span className="text-4xl">💰</span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-pink-100">Favorite Providers</p>
                        <p className="text-3xl font-bold">{favoriteProviders.length}</p>
                      </div>
                      <span className="text-4xl">❤️</span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-gray-50 p-6 rounded-lg" data-tour="upcoming-bookings">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                  {bookings.length > 0 ? (
                    <div className="space-y-3">
                      {bookings.slice(0, 3).map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">📋</span>
                            <div>
                              <p className="font-medium text-gray-900">{booking.service_name}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(booking.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <span className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full',
                            getStatusColor(booking.status)
                          )}>
                            {booking.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              </div>
            )}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div className="space-y-6" data-tour="booking-history">
                {/* Search and Filter */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search bookings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'upcoming' | 'completed' | 'cancelled')}
                        className="pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      >
                        <option value="all">All Status</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bookings List */}
                <div className="space-y-4">
                  {bookings.filter(booking => {
                    const matchesSearch = booking.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                         booking.provider_name.toLowerCase().includes(searchQuery.toLowerCase())
                    const matchesFilter = filterStatus === 'all' || booking.status === filterStatus
                    return matchesSearch && matchesFilter
                  }).map((booking) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      className="bg-white rounded-2xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{booking.service_name}</h3>
                            <p className="text-gray-600">{booking.provider_name}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <div className="flex items-center text-sm text-gray-500">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDate(booking.date)}
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <Clock className="w-4 h-4 mr-1" />
                                {booking.time}
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin className="w-4 h-4 mr-1" />
                                {booking.location}
                              </div>
                            </div>
                            {booking.notes && (
                              <p className="text-sm text-gray-500 mt-2">Note: {booking.notes}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status === 'upcoming' && <Clock className="w-3 h-3 mr-1" />}
                            {booking.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {booking.status === 'cancelled' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </div>
                          <p className="text-lg font-semibold text-gray-900 mt-2">
                            {formatCurrency(booking.price_cents)}
                          </p>
                          {booking.rating && (
                            <div className="flex items-center mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < booking.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Credits Tab */}
            {activeTab === 'credits' && credits && (
              <div className="space-y-6">
                {/* Credit Balance Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Credit Balance</h2>
                      <p className="text-4xl font-bold mt-2">${credits.balance_dollars}</p>
                      <p className="text-blue-100 mt-1">Available to spend</p>
                    </div>
                    <div className="text-right">
                      <Coins className="w-16 h-16 text-white opacity-80" />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="mt-4 bg-white bg-opacity-20 backdrop-blur-sm px-6 py-3 rounded-xl font-medium hover:bg-opacity-30 transition-all flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Credits
                      </motion.button>
                    </div>
                  </div>
                </motion.div>

                {/* Recent Transactions */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Transactions</h3>
                  <div className="space-y-4">
                    {credits.recent_transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            transaction.type === 'purchase' ? 'bg-green-100' :
                            transaction.type === 'usage' ? 'bg-blue-100' :
                            transaction.type === 'bonus' ? 'bg-yellow-100' : 'bg-gray-100'
                          }`}>
                            {transaction.type === 'purchase' && <Plus className="w-5 h-5 text-green-600" />}
                            {transaction.type === 'usage' && <Coins className="w-5 h-5 text-blue-600" />}
                            {transaction.type === 'bonus' && <Award className="w-5 h-5 text-yellow-600" />}
                            {transaction.type === 'refund' && <Zap className="w-5 h-5 text-gray-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                          </div>
                        </div>
                        <div className={`font-semibold ${
                          transaction.amount_cents > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount_cents > 0 ? '+' : ''}{formatCurrency(transaction.amount_cents)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Favorites Tab */}
            {activeTab === 'favorites' && (
              <div className="space-y-6" data-tour="favorites">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteProviders.map((provider, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="font-semibold">{provider.business_name}</h3>
                      <Link href={`/book/${provider.business_name}`}>
                        <Image src={provider.avatar_url} alt={provider.business_name} width={64} height={64} className="w-16 h-16 rounded-full" />
                      </Link>
                      <div className="flex items-center mt-2">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="ml-1">{provider.rating}</span>
                        <span className="text-sm text-gray-500 ml-2">({provider.total_reviews} reviews)</span>
                      </div>
                      <div className="mt-2">
                        {provider.specialties.map((specialty, i) => (
                          <span key={i} className="inline-block px-2 py-1 text-xs bg-gray-100 rounded mr-1 mb-1">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && userProfile && (
              <div className="space-y-6" data-tour="profile-settings">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-start space-x-6">
                    <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                      <User className="w-12 h-12 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">{userProfile.name}</h2>
                        {userProfile.verification_status === 'verified' && (
                          <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            <Shield className="w-4 h-4 mr-1" />
                            Verified
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-gray-600">
                          <Mail className="w-4 h-4 mr-2" />
                          {userProfile.email}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {userProfile.phone || 'No phone number'}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          Member since {formatDate(userProfile.member_since)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Preferences</h3>
                  <div className="space-y-4">
                    {Object.entries(userProfile.preferences).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-gray-700 capitalize">
                          {key.replace('_', ' ')}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            value ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <motion.div
                            className="w-5 h-5 bg-white rounded-full shadow-md"
                            animate={{ x: value ? 24 : 2 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 
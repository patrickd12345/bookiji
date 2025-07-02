// @ts-nocheck - TODO: Fix notification type inference issues
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { Notification, NotificationResponse, NotificationError } from '@/types/notification'
import { 
  User, 
  Calendar, 
  CreditCard, 
  MapPin, 
  Settings, 
  Bell, 
  History, 
  Star, 
  Coins,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Heart,
  Bookmark,
  Share,
  Phone,
  Mail,
  Shield,
  Award,
  TrendingUp,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { NotificationList } from './NotificationList'

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

interface FavoriteProvider {
  id: string
  name: string
  business_name: string
  avatar_url?: string
  rating: number
  total_reviews: number
  distance?: number
  last_booked?: string
  specialties: string[]
}

interface DatabaseProvider {
  business_name: string;
  avatar_url: string;
  rating: number;
  total_reviews: number;
  specialties: string[];
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
}

interface DatabaseFavorite {
  id: string;
  distance?: number;
  last_booked?: string;
  provider: DatabaseProvider;
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

interface NotificationState {
  data: Notification[];
  isLoading: boolean;
  error: string | null;
}

// @ts-nocheck - TODO: Fix notification type inference issues
export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'credits' | 'favorites' | 'profile'>('overview')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [favoriteProviders, setFavoriteProviders] = useState<Provider[]>([])
  const [notificationState, setNotificationState] = useState<NotificationState>({
    data: [],
    isLoading: false,
    error: null
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all')

  useEffect(() => {
    loadUserData()
    loadNotifications()
  }, [])

  const loadNotifications = async (): Promise<void> => {
    setNotificationState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/notifications')
      if (!response.ok) {
        const errorData = await response.json() as NotificationError
        throw new Error(errorData.error || 'Failed to fetch notifications')
      }
      
      const data = await response.json() as NotificationResponse
      setNotificationState({
        data: data.notifications,
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('Failed to load notifications:', error)
      setNotificationState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load notifications'
      }))
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      setNotificationState(prev => ({
        ...prev,
        data: prev.data.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      }))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const refreshNotifications = useCallback(() => {
    loadNotifications()
  }, [])

  // Set up real-time notifications using Supabase
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${supabase.auth.user()?.id}`
        },
        (payload) => {
          setNotificationState(prev => ({
            ...prev,
            data: [payload.new as Notification, ...prev.data]
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadUserData = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No session found')
      }

      await Promise.all([
        loadUserProfile(session.user.id),
        loadUserBookings(session.user.id),
        loadUserCredits(session.user.id),
        loadFavoriteProviders(session.user.id)
      ])
    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async (userId: string) => {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      // Get user stats
      const { data: bookingsStats, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, price_cents')
        .eq('user_id', userId)

      if (bookingsError) throw bookingsError

      const totalBookings = bookingsStats?.length || 0
      const totalSpentCents = bookingsStats?.reduce((sum, booking) => sum + (booking.price_cents || 0), 0) || 0

      // Get favorites count
      const { count: favoritesCount, error: favoritesError } = await supabase
        .from('favorite_providers')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)

      if (favoritesError) throw favoritesError

      // Get average rating
      const { data: ratings, error: ratingsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('user_id', userId)

      if (ratingsError) throw ratingsError

      const averageRating = ratings && ratings.length > 0
        ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length
        : 0

      setUserProfile({
        id: userId,
        name: profile?.full_name || 'User',
        email: profile?.email || '',
        phone: profile?.phone || '',
        avatar_url: profile?.avatar_url,
        member_since: profile?.created_at || new Date().toISOString(),
        verification_status: profile?.is_verified ? 'verified' : 'unverified',
        preferences: profile?.preferences || {
          notifications: true,
          marketing_emails: false,
          sms_alerts: true
        },
        stats: {
          total_bookings: totalBookings,
          total_spent_cents: totalSpentCents,
          favorite_providers: favoritesCount || 0,
          average_rating_given: Number(averageRating.toFixed(1))
        }
      })
    } catch (error) {
      console.error('Error loading user profile:', error)
      // Set default values for new users
      setUserProfile({
        id: userId,
        name: 'New User',
        email: '',
        member_since: new Date().toISOString(),
        verification_status: 'unverified',
        preferences: {
          notifications: true,
          marketing_emails: false,
          sms_alerts: true
        },
        stats: {
          total_bookings: 0,
          total_spent_cents: 0,
          favorite_providers: 0,
          average_rating_given: 0
        }
      })
    }
  }

  const loadUserBookings = async (userId: string) => {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          service_name,
          provider:provider_id (
            name:business_name,
            avatar_url
          ),
          scheduled_for,
          duration_minutes,
          status,
          price_cents,
          location,
          notes,
          reviews (
            rating,
            comment
          )
        `)
        .eq('user_id', userId)
        .order('scheduled_for', { ascending: true })

      if (error) throw error

      setBookings(bookings.map(booking => ({
        id: booking.id,
        service_name: booking.service_name,
        provider_name: booking.provider?.name || 'Unknown Provider',
        provider_avatar: booking.provider?.avatar_url,
        date: new Date(booking.scheduled_for).toISOString().split('T')[0],
        time: new Date(booking.scheduled_for).toTimeString().slice(0, 5),
        duration_minutes: booking.duration_minutes,
        status: booking.status,
        price_cents: booking.price_cents,
        location: booking.location,
        notes: booking.notes,
        rating: booking.reviews?.[0]?.rating,
        review: booking.reviews?.[0]?.comment
      })))
    } catch (error) {
      console.error('Error loading bookings:', error)
      setBookings([])
    }
  }

  const loadUserCredits = async (userId: string) => {
    try {
      // Get current balance
      const { data: balance, error: balanceError } = await supabase
        .from('credit_balances')
        .select('balance_cents')
        .eq('user_id', userId)
        .single()

      if (balanceError) throw balanceError

      // Get recent transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (transactionsError) throw transactionsError

      setCredits({
        balance_cents: balance?.balance_cents || 0,
        balance_dollars: (balance?.balance_cents || 0) / 100,
        recent_transactions: transactions.map(tx => ({
          id: tx.id,
          amount_cents: tx.amount_cents,
          type: tx.type,
          description: tx.description,
          date: new Date(tx.created_at).toISOString()
        }))
      })
    } catch (error) {
      console.error('Error loading credits:', error)
      setCredits({
        balance_cents: 0,
        balance_dollars: 0,
        recent_transactions: []
      })
    }
  }

  const loadFavoriteProviders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          distance,
          last_booked,
          provider:providers (
            business_name,
            avatar_url,
            rating,
            total_reviews,
            specialties,
            location
          )
        `)
        .eq('user_id', userId)
      
      if (error) throw error

      // First cast to unknown, then to our type to handle the type mismatch
      const favorites = (data as unknown) as DatabaseFavorite[]
      
      const providersData: Provider[] = favorites.map(fav => ({
        id: fav.id,
        business_name: fav.provider.business_name,
        avatar_url: fav.provider.avatar_url,
        rating: fav.provider.rating,
        total_reviews: fav.provider.total_reviews,
        specialties: fav.provider.specialties,
        distance: fav.distance,
        last_booked: fav.last_booked,
        location: fav.provider.location
      }))

      setFavoriteProviders(providersData)
    } catch (error) {
      console.error('Error loading favorites:', error)
      setFavoriteProviders([])
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booking.provider_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || booking.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Mobile-First Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">My Dashboard</h1>
                {userProfile && (
                  <p className="text-sm text-gray-500">Welcome back, {userProfile.name.split(' ')[0]}!</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button 
                  className="p-2 text-gray-400 hover:text-gray-600 relative"
                  onClick={refreshNotifications}
                  disabled={notificationState.isLoading}
                >
                  <Bell className={`w-5 h-5 ${notificationState.isLoading ? 'animate-pulse' : ''}`} />
                  {notificationState.data.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                  )}
                </button>
                <div className="absolute top-full right-0 mt-2 w-96 z-50">
                  {notificationState.error ? (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                      {notificationState.error}
                    </div>
                  ) : (
                    <NotificationList />
                  )}
                </div>
              </div>
              <button
                onClick={() => alert('⚙️ Settings panel coming soon!')}
                className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm p-2 mb-8">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'bookings', label: 'Bookings', icon: Calendar },
              { id: 'credits', label: 'Credits', icon: Coins },
              { id: 'favorites', label: 'Favorites', icon: Heart },
              { id: 'profile', label: 'Profile', icon: User }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Overview Tab */}
            {activeTab === 'overview' && userProfile && (
              <div className="space-y-8">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-2xl p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Bookings</p>
                        <p className="text-2xl font-bold text-gray-900">{userProfile.stats.total_bookings}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-2xl p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Spent</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(userProfile.stats.total_spent_cents)}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-2xl p-6 shadow-sm"
                    data-tour="credit-balance"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Credits Balance</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {credits ? `$${credits.balance_dollars}` : '---'}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Coins className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-2xl p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Avg Rating Given</p>
                        <p className="text-2xl font-bold text-gray-900">{userProfile.stats.average_rating_given}</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Star className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Recent Activity */}
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Upcoming Bookings */}
                  <div className="bg-white rounded-2xl shadow-sm p-6" data-tour="upcoming-bookings">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h3>
                      <button
                        onClick={() => setActiveTab('bookings')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View All
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {bookings.filter(b => b.status === 'upcoming').slice(0, 2).map((booking) => (
                        <motion.div
                          key={booking.id}
                          whileHover={{ scale: 1.02 }}
                          className="flex items-center space-x-4 p-4 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors cursor-pointer"
                        >
                          <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{booking.service_name}</p>
                            <p className="text-sm text-gray-600">{booking.provider_name}</p>
                            <p className="text-sm text-blue-600">{formatDate(booking.date)} at {booking.time}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Favorite Providers */}
                  <div className="bg-white rounded-2xl shadow-sm p-6" data-tour="favorites">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Favorite Providers</h3>
                      <button
                        onClick={() => setActiveTab('favorites')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View All
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {favoriteProviders.slice(0, 2).map((provider) => (
                        <motion.div
                          key={provider.id}
                          whileHover={{ scale: 1.02 }}
                          className="flex items-center space-x-4 p-4 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors cursor-pointer"
                        >
                          <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{provider.business_name}</p>
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-600 ml-1">{provider.rating}</span>
                              </div>
                              <span className="text-sm text-gray-400">•</span>
                              <span className="text-sm text-gray-600">{provider.distance} mi</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
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
                        onChange={(e) => setFilterStatus(e.target.value as any)}
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
                  {filteredBookings.map((booking) => (
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
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteProviders.map((provider, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="font-semibold">{provider.business_name}</h3>
                      <Link href={`/book/${provider.business_name}`}>
                        <img src={provider.avatar_url} alt={provider.business_name} className="w-16 h-16 rounded-full" />
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
} 
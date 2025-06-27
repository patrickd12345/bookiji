'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'credits' | 'favorites' | 'profile'>('overview')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [favorites, setFavorites] = useState<FavoriteProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all')

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    setLoading(true)
    try {
      // Simulate API calls
      await Promise.all([
        loadUserProfile(),
        loadUserBookings(),
        loadUserCredits(),
        loadFavoriteProviders()
      ])
    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async () => {
    // Mock user profile data
    const mockProfile: UserProfile = {
      id: 'user_demo_123',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1 (555) 123-4567',
      avatar_url: '/api/placeholder/80/80',
      member_since: '2023-03-15',
      verification_status: 'verified',
      preferences: {
        notifications: true,
        marketing_emails: false,
        sms_alerts: true
      },
      stats: {
        total_bookings: 24,
        total_spent_cents: 165000, // $1,650
        favorite_providers: 8,
        average_rating_given: 4.8
      }
    }
    setUserProfile(mockProfile)
  }

  const loadUserBookings = async () => {
    // Mock bookings data
    const mockBookings: Booking[] = [
      {
        id: 'booking_1',
        service_name: 'Premium Hair Cut & Style',
        provider_name: 'Elite Hair Studio',
        provider_avatar: '/api/placeholder/40/40',
        date: '2024-01-20',
        time: '14:30',
        duration_minutes: 90,
        status: 'upcoming',
        price_cents: 8500,
        location: 'Downtown NYC',
        notes: 'Please use organic products'
      },
      {
        id: 'booking_2',
        service_name: 'Deep Tissue Massage',
        provider_name: 'Wellness Center Pro',
        provider_avatar: '/api/placeholder/40/40',
        date: '2024-01-15',
        time: '10:00',
        duration_minutes: 60,
        status: 'completed',
        price_cents: 12000,
        location: 'Midtown NYC',
        rating: 5,
        review: 'Amazing experience! Very professional and relaxing.'
      },
      {
        id: 'booking_3',
        service_name: 'Manicure & Pedicure',
        provider_name: 'Nail Art Express',
        provider_avatar: '/api/placeholder/40/40',
        date: '2024-01-10',
        time: '16:00',
        duration_minutes: 75,
        status: 'completed',
        price_cents: 6500,
        location: 'Upper East Side',
        rating: 4,
        review: 'Good service, clean facility.'
      }
    ]
    setBookings(mockBookings)
  }

  const loadUserCredits = async () => {
    try {
      const response = await fetch('/api/credits/balance?userId=demo-user-123')
      const data = await response.json()
      
      if (data.success) {
        setCredits({
          balance_cents: data.credits.balance_cents,
          balance_dollars: data.balance_dollars,
          recent_transactions: [
            {
              id: 'txn_1',
              amount_cents: 5000,
              type: 'purchase',
              description: 'Credit package purchase',
              date: '2024-01-18'
            },
            {
              id: 'txn_2',
              amount_cents: -8500,
              type: 'usage',
              description: 'Hair appointment payment',
              date: '2024-01-15'
            },
            {
              id: 'txn_3',
              amount_cents: 1000,
              type: 'bonus',
              description: 'Referral bonus',
              date: '2024-01-10'
            }
          ]
        })
      }
    } catch (error) {
      console.error('Failed to load credits:', error)
    }
  }

  const loadFavoriteProviders = async () => {
    // Mock favorite providers
    const mockFavorites: FavoriteProvider[] = [
      {
        id: 'provider_1',
        name: 'Maria Garcia',
        business_name: 'Elite Hair Studio',
        avatar_url: '/api/placeholder/60/60',
        rating: 4.9,
        total_reviews: 156,
        distance: 0.8,
        last_booked: '2024-01-15',
        specialties: ['Hair Styling', 'Color Treatment', 'Bridal']
      },
      {
        id: 'provider_2',
        name: 'David Chen',
        business_name: 'Wellness Center Pro',
        avatar_url: '/api/placeholder/60/60',
        rating: 4.8,
        total_reviews: 203,
        distance: 1.2,
        last_booked: '2023-12-20',
        specialties: ['Deep Tissue', 'Swedish', 'Sports Massage']
      }
    ]
    setFavorites(mockFavorites)
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
              <button className="p-2 text-gray-400 hover:text-gray-600 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
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
                  <div className="bg-white rounded-2xl shadow-sm p-6">
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
                  <div className="bg-white rounded-2xl shadow-sm p-6">
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
                      {favorites.slice(0, 2).map((provider) => (
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
              <div className="space-y-6">
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
                  {favorites.map((provider) => (
                    <motion.div
                      key={provider.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white rounded-2xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-all"
                    >
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-2xl"></div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{provider.business_name}</h3>
                          <p className="text-gray-600">{provider.name}</p>
                          <div className="flex items-center mt-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm text-gray-600 ml-1">{provider.rating}</span>
                            <span className="text-sm text-gray-400 ml-1">({provider.total_reviews})</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {provider.specialties.map((specialty) => (
                          <span
                            key={specialty}
                            className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          {provider.distance && `${provider.distance} mi away`}
                        </div>
                        <div className="flex space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Heart className="w-5 h-5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <Share className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && userProfile && (
              <div className="space-y-6">
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
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface AdminStats {
  totalUsers: number
  totalVendors: number
  totalBookings: number
  totalRevenue: number
  activeBookings: number
  pendingVendors: number
  thisMonth: {
    newUsers: number
    newVendors: number
    bookings: number
    revenue: number
  }
}

interface PendingVendor {
  id: string
  business_name: string
  email: string
  service_type: string
  location: string
  submitted_at: string
  requires_approval: boolean
}

interface RecentBooking {
  id: string
  customer_name: string
  vendor_name: string
  service: string
  date: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  amount: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([])
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'bookings' | 'system'>('overview')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Mock data for demo
      const mockStats: AdminStats = {
        totalUsers: 1247,
        totalVendors: 89,
        totalBookings: 2156,
        totalRevenue: 215600,
        activeBookings: 23,
        pendingVendors: 7,
        thisMonth: {
          newUsers: 156,
          newVendors: 12,
          bookings: 234,
          revenue: 23400
        }
      }

      setStats(mockStats)
      setPendingVendors([
        {
          id: '1',
          business_name: 'Elite Hair Studio',
          email: 'contact@elitehair.com',
          service_type: 'Hair & Beauty',
          location: 'New York, NY',
          submitted_at: '2024-01-14T10:30:00Z',
          requires_approval: false
        }
      ])
      setRecentBookings([])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bookiji Admin</h1>
              <p className="text-sm text-gray-600">Platform management & analytics</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Users
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalUsers.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🏪</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Vendors
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalVendors}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📅</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Bookings
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalBookings.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Revenue
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(stats.totalRevenue)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-600">Database connected and operational</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-600">Payment processing active</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-600">All APIs responding normally</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
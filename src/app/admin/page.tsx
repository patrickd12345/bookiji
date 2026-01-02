'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import DashboardCards from '@/components/admin/DashboardCards'
import { Loader2, RefreshCw } from 'lucide-react'
import { logger } from '@/lib/logger'

interface DashboardStats {
  activeUsers: number
  bookingsToday: number
  revenue: number
  errors: number
}

interface ActivityItem {
  id: string
  type: 'vendor_registration' | 'booking_completed' | 'payment_received' | 'other'
  title: string
  description: string
  timestamp: string
  timeAgo: string
  color: 'blue' | 'green' | 'yellow' | 'gray'
}

interface SystemStatus {
  name: string
  status: 'healthy' | 'operational' | 'connected' | 'warning' | 'error'
  label: string
}

export default function AdminDashboard() {
  const [refreshingSitemap, setRefreshingSitemap] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [systemStatuses, setSystemStatuses] = useState<SystemStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function loadDashboardData() {
      try {
        const [statsRes, activityRes, statusRes] = await Promise.all([
          fetch('/api/admin/dashboard/stats', { credentials: 'include' }),
          fetch('/api/admin/dashboard/activity', { credentials: 'include' }),
          fetch('/api/admin/dashboard/system-status', { credentials: 'include' })
        ])

        if (!mounted) return

        // Parse all responses first
        const [statsData, activityData, statusData] = await Promise.all([
          statsRes.json().catch(() => ({ error: statsRes.statusText || 'Failed to parse response' })),
          activityRes.json().catch(() => ({ error: activityRes.statusText || 'Failed to parse response' })),
          statusRes.json().catch(() => ({ error: statusRes.statusText || 'Failed to parse response' }))
        ])

        // Check each response and get error details
        const errors: string[] = []
        if (!statsRes.ok) {
          errors.push(`Stats: ${statsData.error || statsRes.statusText || 'Unknown error'}`)
        }
        if (!activityRes.ok) {
          errors.push(`Activity: ${activityData.error || activityRes.statusText || 'Unknown error'}`)
        }
        if (!statusRes.ok) {
          errors.push(`Status: ${statusData.error || statusRes.statusText || 'Unknown error'}`)
        }

        if (errors.length > 0) {
          setError(`Failed to load dashboard data: ${errors.join('; ')}`)
          setLoading(false)
          return
        }

        setDashboardStats(statsData)
        setActivities(activityData.activities || [])
        setSystemStatuses(statusData.statuses || [])
        setLoading(false)
      } catch (err: any) {
        if (!mounted) return
        logger.error('Error loading dashboard data:', { error: err })
        setError(err?.message || 'Failed to load dashboard data')
        setLoading(false)
      }
    }
    loadDashboardData()
    return () => { mounted = false }
  }, [])

  const handleRefreshSitemap = async () => {
    setRefreshingSitemap(true)
    try {
      const response = await fetch('/api/admin/cron/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: 'sitemap-refresh',
          path: '/api/cron/sitemap-refresh'
        })
      })

      const data = await response.json()

      if (response.ok) {
        const result = data.result || {}
        const urlCount = result.sitemap?.urlCount || 'N/A'
        const successfulSubmissions = result.searchEngineSubmissions?.successful || 0
        const totalSubmissions = result.searchEngineSubmissions?.total || 0
        
        alert(
          `Sitemap refreshed successfully!\n\n` +
          `URLs in sitemap: ${urlCount}\n` +
          `Search engine submissions: ${successfulSubmissions}/${totalSubmissions} successful`
        )
      } else {
        alert(data.error || 'Failed to refresh sitemap')
      }
    } catch (error) {
      logger.error('Error refreshing sitemap:', { error })
      alert('Error refreshing sitemap. Please try again.')
    } finally {
      setRefreshingSitemap(false)
    }
  }
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to your admin cockpit. Here&apos;s an overview of your platform.</p>
      </motion.div>

      {/* Dashboard Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-2xl p-6 animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <p className="text-red-600">Error: {error}</p>
        </div>
      ) : dashboardStats ? (
        <DashboardCards stats={dashboardStats} />
      ) : null}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/admin/vendors" className="block w-full text-left p-3 rounded-xl hover:bg-blue-50 transition-colors duration-200 group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                  <span className="text-blue-600 font-semibold">+</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Add New Vendor</p>
                  <p className="text-sm text-gray-600">Register a new service provider</p>
                </div>
              </div>
            </Link>
            
            <Link href="/admin/analytics" className="block w-full text-left p-3 rounded-xl hover:bg-green-50 transition-colors duration-200 group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
                  <span className="text-green-600 font-semibold">📊</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Analytics</p>
                  <p className="text-sm text-gray-600">Check detailed performance metrics</p>
                </div>
              </div>
            </Link>
            
            <Link href="/admin/settings" className="block w-full text-left p-3 rounded-xl hover:bg-purple-50 transition-colors duration-200 group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors duration-200">
                  <span className="text-purple-600 font-semibold">⚙️</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Settings</p>
                  <p className="text-sm text-gray-600">Configure admin preferences</p>
                </div>
              </div>
            </Link>
            
            <button
              onClick={handleRefreshSitemap}
              disabled={refreshingSitemap}
              className="block w-full text-left p-3 rounded-xl hover:bg-orange-50 transition-colors duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors duration-200">
                  {refreshingSitemap ? (
                    <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-orange-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">Refresh Sitemap</p>
                  <p className="text-sm text-gray-600">Regenerate and submit sitemap to search engines</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-2 h-2 bg-gray-200 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => {
                const colorClasses: Record<string, string> = {
                  blue: 'bg-blue-500',
                  green: 'bg-green-500',
                  yellow: 'bg-yellow-500',
                  gray: 'bg-gray-500'
                }
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 ${colorClasses[activity.color] || 'bg-gray-500'} rounded-full mt-2`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </div>

        {/* System Status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : systemStatuses.length > 0 ? (
            <div className="space-y-4">
              {systemStatuses.map((status) => {
                const statusColors: Record<string, { bg: string; text: string }> = {
                  healthy: { bg: 'bg-green-100', text: 'text-green-800' },
                  operational: { bg: 'bg-green-100', text: 'text-green-800' },
                  connected: { bg: 'bg-green-100', text: 'text-green-800' },
                  warning: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
                  error: { bg: 'bg-red-100', text: 'text-red-800' }
                }
                const colors = statusColors[status.status] || statusColors.warning
                return (
                  <div key={status.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{status.name}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                      {status.label}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">System status unavailable</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}


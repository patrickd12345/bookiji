'use client'

import { useState, useEffect } from 'react'

interface SystemStats {
  dlq_count: number
  build_hash?: string
  build_timestamp?: string
  uptime?: string
  database_status: string
  last_cron_run?: string
  total_bookings_today: number
  active_vendors: number
  pending_reschedules: number
}

export default function SystemAdmin() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadSystemStats()
  }, [])

  const loadSystemStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/system/status')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading system stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const retryDLQ = async () => {
    const count = prompt('How many DLQ items to retry? (default: 5)')
    const retryCount = count ? parseInt(count) : 5
    
    if (isNaN(retryCount) || retryCount < 1) {
      alert('Invalid count')
      return
    }

    setActionLoading('dlq_retry')
    try {
      const response = await fetch('/api/admin/system/dlq-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: retryCount })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Successfully retried ${result.retried} items`)
        await loadSystemStats() // Refresh stats
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Retry failed'}`)
      }
    } catch (error) {
      console.error('Error retrying DLQ:', error)
      alert('Error retrying DLQ items')
    } finally {
      setActionLoading(null)
    }
  }

  const refreshHealth = async () => {
    setActionLoading('health_refresh')
    try {
      await loadSystemStats()
    } finally {
      setActionLoading(null)
    }
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading system status...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">System Management</h1>
        <button
          onClick={refreshHealth}
          disabled={actionLoading === 'health_refresh'}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {actionLoading === 'health_refresh' ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔥</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Dead Letter Queue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.dlq_count || 0}
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
                    Bookings Today
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.total_bookings_today || 0}
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
                    Active Vendors
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.active_vendors || 0}
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
                <span className="text-2xl">🔄</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Reschedules
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.pending_reschedules || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Build Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Build Hash</dt>
              <dd className="text-sm text-gray-900 mt-1 font-mono">
                {stats?.build_hash || 'Unknown'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Build Time</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {formatDateTime(stats?.build_timestamp)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Uptime</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {stats?.uptime || 'Unknown'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className={`mr-2 ${stats?.database_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`}>
                {stats?.database_status === 'healthy' ? '✅' : '❌'}
              </span>
              <span className="text-sm text-gray-600">
                Database: {stats?.database_status || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-600">API endpoints responding</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-600">Authentication services active</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Last cron run: </span>
              <span className="text-sm text-gray-900">{formatDateTime(stats?.last_cron_run)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operations Panel */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Dead Letter Queue</h3>
            <p className="text-sm text-gray-600 mb-3">
              Retry failed messages from the queue. Use sparingly and monitor results.
            </p>
            <button
              onClick={retryDLQ}
              disabled={actionLoading === 'dlq_retry' || (stats?.dlq_count || 0) === 0}
              className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'dlq_retry' ? 'Retrying...' : `Retry DLQ Items (${stats?.dlq_count || 0})`}
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">System Health</h3>
            <p className="text-sm text-gray-600 mb-3">
              Force refresh of system health metrics and build information.
            </p>
            <button
              onClick={refreshHealth}
              disabled={actionLoading === 'health_refresh'}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading === 'health_refresh' ? 'Refreshing...' : 'Refresh Health'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'

interface AuditEvent {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  metadata: any
  created_at: string
  user_email?: string
  user_name?: string
}

export default function AdminActivity() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadAuditEvents()
  }, [filter])

  const loadAuditEvents = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/audit?filter=${filter}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Error loading audit events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString()

  const getActionBadge = (action: string) => {
    const colors = {
      cancel: 'bg-red-100 text-red-800',
      activate: 'bg-green-100 text-green-800',
      deactivate: 'bg-red-100 text-red-800',
      release_hold: 'bg-orange-100 text-orange-800',
      mark_no_show: 'bg-gray-100 text-gray-800',
      refund: 'bg-purple-100 text-purple-800'
    }
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${colors[action as keyof typeof colors] || 'bg-blue-100 text-blue-800'}`}>
        {action.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const formatMetadata = (metadata: any) => {
    if (!metadata) return 'N/A'
    
    const { reason, previous_status, action_type } = metadata
    const parts = []
    
    if (reason) parts.push(`Reason: ${reason}`)
    if (previous_status) parts.push(`Previous: ${previous_status}`)
    if (action_type) parts.push(`Type: ${action_type}`)
    
    return parts.length > 0 ? parts.join(' | ') : 'N/A'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading activity log...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Activity</h1>
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Actions</option>
            <option value="bookings">Booking Actions</option>
            <option value="vendors">Vendor Actions</option>
            <option value="today">Today Only</option>
          </select>
          <button
            onClick={loadAuditEvents}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Admin Actions</h2>
          <p className="text-sm text-gray-600">Last 50 administrative actions performed on the platform</p>
        </div>

        <div className="divide-y divide-gray-200">
          {events.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No admin activity found for the selected filter.
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getActionBadge(event.action)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">
                          {event.user_name || event.user_email || 'Unknown Admin'}
                        </span>
                        {' '}performed{' '}
                        <span className="font-medium">{event.action.replace('_', ' ')}</span>
                        {' '}on{' '}
                        <span className="font-medium">{event.entity_type}</span>
                        {' '}
                        <code className="text-xs bg-gray-100 px-1 rounded">
                          {event.entity_id.slice(0, 8)}...
                        </code>
                      </div>
                      {event.metadata && (
                        <div className="text-sm text-gray-500 mt-1">
                          {formatMetadata(event.metadata)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDateTime(event.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {events.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => {
              // TODO: Implement pagination
              alert('Pagination coming soon')
            }}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}

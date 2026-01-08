"use client";

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/useI18n'
import { useAuth } from '../../hooks/useAuth'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  duration: number
  customer: string
  service: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  price: number
}

interface QuickActionModalProps {
  type: 'availability' | 'block' | 'service';
  providerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function QuickActionModal({ type, providerId, onClose, onSuccess }: QuickActionModalProps) {
  const [form, setForm] = useState({
    date: '',
    start: '',
    end: '',
    name: '',
    duration: 60,
    price: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (type === 'availability') {
        await fetch('/api/availability/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId }),
        });
      } else if (type === 'block') {
        await fetch('/api/blocks/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId,
            date: form.date,
            start: form.start,
            end: form.end,
            reason: 'Vendor block via dashboard',
          }),
        });
      } else if (type === 'service') {
        await fetch('/api/vendor/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId: providerId,
            service: {
              name: form.name,
              duration_minutes: Number(form.duration),
              price_cents: Number(form.price) * 100,
              description: '',
            },
          }),
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Quick action error:', error);
      alert('Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold mb-4 capitalize">{type === 'availability' ? 'Generate Availability' : type === 'block' ? 'Block Time' : 'Add Service'}</h3>

        {type === 'block' && (
          <div className="space-y-3">
            <input type="date" className="w-full border px-3 py-2 rounded" value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})} />
            <input type="time" className="w-full border px-3 py-2 rounded" value={form.start} onChange={(e)=>setForm({...form,start:e.target.value})} />
            <input type="time" className="w-full border px-3 py-2 rounded" value={form.end} onChange={(e)=>setForm({...form,end:e.target.value})} />
          </div>
        )}

        {type === 'service' && (
          <div className="space-y-3">
            <input type="text" placeholder="Service Name" className="w-full border px-3 py-2 rounded" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
            <input type="number" placeholder="Duration (min)" className="w-full border px-3 py-2 rounded" value={form.duration} onChange={(e)=>setForm({...form,duration:Number(e.target.value)})} />
            <input type="number" placeholder="Price ($)" className="w-full border px-3 py-2 rounded" value={form.price} onChange={(e)=>setForm({...form,price:Number(e.target.value)})} />
          </div>
        )}

        {type === 'availability' && (
          <p className="text-sm text-gray-600 mb-4">Generate 30 days of availability based on your schedule and connected calendar.</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading} onClick={handleSubmit}>{loading ? 'Processing...' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}

export default function VendorCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  // Removed unused 'availability' state
  const [view, setView] = useState<'month' | 'week' | 'day'>('week')
  const [isLoading, setIsLoading] = useState(true)
  const i18n = useI18n()
  const formatDate = i18n.formatDate || ((date: Date) => date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }))
  const formatCurrency = i18n.formatCurrency || ((amount: number) => `$${amount.toFixed(2)}`)
  const [action, setAction] = useState<null | 'availability' | 'block' | 'service'>(null)
  const { user } = useAuth()
  const vendorId = user?.id || ''

  const loadCalendarData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch only bookings as schedule data was unused
      const bookingsResponse = await fetch('/api/bookings/vendor')
      
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        if (bookingsData.success) {
          setEvents(bookingsData.bookings || [])
        }
      }
    } catch (error) {
      console.error('Error loading calendar data:', error)
    } finally {
      setIsLoading(false)
    }
  }, []) // No dependencies

  useEffect(() => {
    loadCalendarData()
    // Intentionally omit currentDate and view from dependencies
    // as the API returns a fixed set of data and doesn't depend on them.
    // This prevents unnecessary re-fetches when switching views.
  }, [loadCalendarData])

  const handleBookingStatusChange = async (bookingId: string, newStatus: CalendarEvent['status']) => {
    try {
      // Update booking status via API
      const response = await fetch('/api/bookings/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          status: newStatus
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Update local booking state
          setEvents((prev: CalendarEvent[]) => prev.map((booking: CalendarEvent) => 
            booking.id === bookingId 
              ? { ...booking, status: newStatus }
              : booking
          ))
          
          // Show success notification
          alert(`Booking status updated to ${newStatus}`)
        } else {
          throw new Error(data.error || 'Failed to update booking status')
        }
      } else {
        throw new Error('Network error updating booking status')
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      alert('Failed to update booking status. Please try again.')
    }
  }

  const getStatusColor = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Remove hardcoded currency formatting - using i18n instead

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading calendar...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Calendar</h1>
          <p className="text-gray-600">Manage your bookings and availability</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <a
            href="/vendor/calendar/sync-status"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Manage Sync
          </a>
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['month', 'week', 'day'] as const).map((viewType) => (
              <button
                key={viewType}
                onClick={() => setView(viewType)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  view === viewType
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <span className="text-lg font-medium">
              {formatDate(currentDate)}
            </span>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h2>
          
          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No bookings scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900">{event.service}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>👤 {event.customer}</p>
                        <p>📅 {new Date(event.date).toLocaleDateString()} at {event.time}</p>
                        <p>⏱️ {event.duration} minutes</p>
                        <p>💰 {formatCurrency(event.price * 100)}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      {event.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleBookingStatusChange(event.id, 'confirmed')}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleBookingStatusChange(event.id, 'cancelled')}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      
                      {event.status === 'confirmed' && (
                        <button
                          onClick={() => handleBookingStatusChange(event.id, 'completed')}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Availability Panel */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          
          <div className="bg-white border rounded-lg p-4 space-y-4">
            <button
              onClick={() => setAction('availability')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Set Availability
            </button>
            
            <button
              onClick={() => setAction('block')}
              className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              Block Time
            </button>
            
            <button
              onClick={() => setAction('service')}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Add Service
            </button>
          </div>

          {/* Summary Stats */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">This Week</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Bookings:</span>
                <span className="font-medium">{events.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Confirmed:</span>
                <span className="font-medium text-green-600">
                  {events.filter(e => e.status === 'confirmed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending:</span>
                <span className="font-medium text-yellow-600">
                  {events.filter(e => e.status === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue:</span>
                <span className="font-medium">
                  {formatCurrency(events.reduce((sum, e) => sum + e.price * 100, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Modal */}
      {action && (
        <QuickActionModal
          type={action}
          providerId={vendorId}
          onClose={() => setAction(null)}
          onSuccess={() => {
            loadCalendarData()
            setAction(null)
          }}
        />
      )}
    </div>
  )
}

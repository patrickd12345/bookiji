'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RescheduleCountdown from './RescheduleCountdown'

interface BookingActionsProps {
  booking: {
    id: string
    status: string
    vendorPhone?: string
    vendor_id: string
    service_id: string
    customer_id: string
  }
}

export default function BookingActions({ booking }: BookingActionsProps) {
  const [token, setToken] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [showReschedulePicker, setShowReschedulePicker] = useState(false)
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null)
  const router = useRouter()

  async function startReschedule() {
    setBusy(true)
    try {
      const response = await fetch(`/api/bookings/${booking.id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reschedule' }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setToken(result.token)
        setPrefill(result.prefill)
        setHoldExpiresAt(result.holdExpiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString())
        setShowReschedulePicker(true)
      } else {
        alert(result.error || 'Failed to start reschedule')
      }
    } catch (error) {
      alert('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function abortReschedule() {
    try {
      await fetch(`/api/bookings/${booking.id}/reschedule/cancel`, { 
        method: 'POST' 
      })
      setToken(null)
      setPrefill(null)
      setHoldExpiresAt(null)
      setShowReschedulePicker(false)
    } catch (error) {
      alert('Failed to abort reschedule')
    }
  }

  async function completeReschedule(newStart: string, newEnd: string) {
    if (!token) return
    
    // Validate times
    if (!newStart || !newEnd) {
      alert('Please select both start and end times')
      return
    }
    
    const startTime = new Date(newStart)
    const endTime = new Date(newEnd)
    const now = new Date()
    
    if (startTime <= now) {
      alert('Start time must be in the future')
      return
    }
    
    if (endTime <= startTime) {
      alert('End time must be after start time')
      return
    }
    
    try {
      const response = await fetch('/api/bookings/reschedule/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ 
          token, 
          newStart: startTime.toISOString(), 
          newEnd: endTime.toISOString() 
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Redirect to confirmation page
        router.push(`/confirm/${result.bookingId}`)
      } else {
        alert(result.error || 'Failed to complete reschedule')
      }
    } catch (error) {
      alert('Network error. Please try again.')
    }
  }

  function handleHoldExpired() {
    setToken(null)
    setPrefill(null)
    setHoldExpiresAt(null)
    setShowReschedulePicker(false)
    // Optionally refresh the page or show a message
    alert('Reschedule hold expired. Your original booking has been restored.')
  }

  // Only show actions for confirmed bookings
  if (booking.status !== 'confirmed') {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={busy}
          onClick={startReschedule}
        >
          {busy ? 'Starting...' : '🔄 Reschedule'}
        </button>

        {/* Per current policy: no in-app cancel; show phone */}
        {booking.vendorPhone && (
          <a
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            href={`tel:${booking.vendorPhone}`}
          >
            📞 Call to Cancel
          </a>
        )}
      </div>

      {/* Reschedule Picker Modal */}
      {showReschedulePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Pick New Time</h3>
              <button
                onClick={abortReschedule}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Countdown Timer */}
            {holdExpiresAt && (
              <RescheduleCountdown 
                expiresAt={holdExpiresAt} 
                onExpired={handleHoldExpired} 
              />
            )}

            <div className="mb-4 text-sm text-gray-600">
              Your current booking is held for 15 minutes. Pick a new time to complete the reschedule.
            </div>

            {/* Enhanced time picker with validation */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Start Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().slice(0, 16)}
                  defaultValue={prefill?.suggestedStart || ''}
                  onChange={(e) => setPrefill({ ...prefill, suggestedStart: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be in the future
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New End Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={prefill?.suggestedStart || new Date().toISOString().slice(0, 16)}
                  defaultValue={prefill?.suggestedEnd || ''}
                  onChange={(e) => setPrefill({ ...prefill, suggestedEnd: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be after start time
                </p>
              </div>
              
              {/* Quick time suggestions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date()
                    const start = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
                    const end = new Date(start.getTime() + 60 * 60 * 1000) // 1 hour duration
                    setPrefill({
                      ...prefill,
                      suggestedStart: start.toISOString().slice(0, 16),
                      suggestedEnd: end.toISOString().slice(0, 16)
                    })
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ⏰ 1 hour from now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date()
                    const start = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now
                    const end = new Date(start.getTime() + 60 * 60 * 1000) // 1 hour duration
                    setPrefill({
                      ...prefill,
                      suggestedStart: start.toISOString().slice(0, 16),
                      suggestedEnd: end.toISOString().slice(0, 16)
                    })
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ⏰ 2 hours from now
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => completeReschedule(prefill.suggestedStart, prefill.suggestedEnd)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!prefill.suggestedStart || !prefill.suggestedEnd}
              >
                ✅ Complete Reschedule
              </button>
              <button
                onClick={abortReschedule}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

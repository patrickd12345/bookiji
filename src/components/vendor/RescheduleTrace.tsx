'use client'

import { useState, useEffect } from 'react'

interface RescheduleTraceProps {
  bookingId: string
}

interface RescheduleData {
  reschedule_of_booking_id?: string
  replaced_by_booking_id?: string
  original_booking?: {
    id: string
    slot_start: string
    slot_end: string
    customer_name: string
    status: string
  }
  replacement_booking?: {
    id: string
    slot_start: string
    slot_end: string
    customer_name: string
    status: string
  }
}

export default function RescheduleTrace({ bookingId }: RescheduleTraceProps) {
  const [rescheduleData, setRescheduleData] = useState<RescheduleData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRescheduleData() {
      try {
        const response = await fetch(`/api/bookings/${bookingId}/reschedule-trace`)
        if (response.ok) {
          const data = await response.json()
          setRescheduleData(data)
        }
      } catch (error) {
        console.error('Failed to fetch reschedule data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRescheduleData()
  }, [bookingId])

  if (loading) {
    return <div className="animate-pulse">Loading reschedule history...</div>
  }

  if (!rescheduleData || (!rescheduleData.reschedule_of_booking_id && !rescheduleData.replaced_by_booking_id)) {
    return null // No reschedule data to show
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">🔄 Reschedule History</h4>
      
      {/* Original booking (if this is a rescheduled booking) */}
      {rescheduleData.reschedule_of_booking_id && rescheduleData.original_booking && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm text-blue-800 font-medium">Original Booking</div>
          <div className="text-xs text-blue-600">
            {new Date(rescheduleData.original_booking.slot_start).toLocaleDateString()} at{' '}
            {new Date(rescheduleData.original_booking.slot_start).toLocaleTimeString()}
          </div>
          <div className="text-xs text-blue-600">
            Customer: {rescheduleData.original_booking.customer_name}
          </div>
          <div className="text-xs text-blue-600">
            Status: <span className="capitalize">{rescheduleData.original_booking.status}</span>
          </div>
        </div>
      )}

      {/* Replacement booking (if this booking was replaced) */}
      {rescheduleData.replaced_by_booking_id && rescheduleData.replacement_booking && (
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <div className="text-sm text-green-800 font-medium">Replaced By</div>
          <div className="text-xs text-green-600">
            {new Date(rescheduleData.replacement_booking.slot_start).toLocaleDateString()} at{' '}
            {new Date(rescheduleData.replacement_booking.slot_start).toLocaleTimeString()}
          </div>
          <div className="text-xs text-green-600">
            Customer: {rescheduleData.replacement_booking.customer_name}
          </div>
          <div className="text-xs text-green-600">
            Status: <span className="capitalize">{rescheduleData.replacement_booking.status}</span>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        💡 This shows the continuity of the customer's appointment
      </div>
    </div>
  )
}

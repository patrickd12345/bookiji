'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import BookingActions from './booking/BookingActions'

interface BookingStatus {
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
  commitment_fee_paid: boolean
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  created_at: string
  slot_start: string
  id: string // Added id to the interface
}

interface ConfirmationStatusProps {
  bookingId: string
  initialStatus?: BookingStatus
  className?: string
  showActions?: boolean
  onStatusChange?: (newStatus: BookingStatus) => void
}

const STATUS_CONFIG = {
  pending: {
    color: 'yellow',
    icon: '⏳',
    title: 'Booking Pending',
    description: 'Waiting for provider confirmation'
  },
  confirmed: {
    color: 'green',
    icon: '✓',
    title: 'Booking Confirmed',
    description: 'Your appointment is confirmed'
  },
  cancelled: {
    color: 'red',
    icon: '✕',
    title: 'Booking Cancelled',
    description: 'This booking has been cancelled'
  },
  completed: {
    color: 'blue',
    icon: '🎉',
    title: 'Booking Completed',
    description: 'Service has been completed'
  },
  'no-show': {
    color: 'orange',
    icon: '⚠️',
    title: 'No Show',
    description: 'Customer did not attend the appointment'
  }
}

const PAYMENT_STATUS_CONFIG = {
  pending: { color: 'yellow', text: 'Payment Pending' },
  paid: { color: 'green', text: 'Payment Confirmed' },
  failed: { color: 'red', text: 'Payment Failed' },
  refunded: { color: 'blue', text: 'Payment Refunded' }
}

export default function ConfirmationStatus({ 
  bookingId, 
  initialStatus, 
  className = '',
  showActions = false,
  onStatusChange 
}: ConfirmationStatusProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<BookingStatus | null>(initialStatus || null)
  const [loading, setLoading] = useState(!initialStatus)
  const [error, setError] = useState<string | null>(null)

  const fetchBookingStatus = useCallback(async () => {
    try {
      setLoading(true)
      if (!user?.id) {
        throw new Error('User not authenticated')
      }
      const response = await fetch(`/api/bookings/user?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        const booking = data.bookings.find((b: unknown) => (b as BookingStatus).id === bookingId)
        if (booking) {
          const bookingStatus: BookingStatus = {
            id: (booking as BookingStatus).id,
            status: (booking as BookingStatus).status,
            commitment_fee_paid: (booking as BookingStatus).commitment_fee_paid,
            payment_status: (booking as BookingStatus).payment_status || 'pending',
            created_at: (booking as BookingStatus).created_at,
            slot_start: (booking as BookingStatus).slot_start
          }
          setStatus(bookingStatus)
          onStatusChange?.(bookingStatus)
        } else {
          setError('Booking not found')
        }
      } else {
        setError(data.error || 'Failed to fetch booking status')
      }
    } catch (error) {
      console.error('Error fetching booking status:', error)
      setError('Failed to fetch booking status')
    } finally {
      setLoading(false)
    }
  }, [bookingId, onStatusChange, user])

  useEffect(() => {
    if (!initialStatus) {
      fetchBookingStatus()
    }
  }, [bookingId, initialStatus, fetchBookingStatus])



  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-gray-600">Loading status...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchBookingStatus}
          className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!status) {
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <p className="text-gray-600">No status information available</p>
      </div>
    )
  }

  const config = STATUS_CONFIG[status.status]
  const paymentConfig = PAYMENT_STATUS_CONFIG[status.payment_status]
  const isUpcoming = new Date(status.slot_start) > new Date()
  const canCancel = isUpcoming && ['pending', 'confirmed'].includes(status.status)

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Main Status */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className={`text-3xl mr-4`}>
              {config.icon}
            </div>
            <div>
              <h3 className={`text-lg font-semibold text-${config.color}-800`}>
                {config.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {config.description}
              </p>
            </div>
          </div>
          
          <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium bg-${config.color}-100 text-${config.color}-800`}>
            {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
          </div>
        </div>

        {/* Payment Status */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-600">Payment Status</span>
              <div className="flex items-center mt-1">
                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium bg-${paymentConfig.color}-100 text-${paymentConfig.color}-800`}>
                  {paymentConfig.text}
                </span>
                {status.commitment_fee_paid && (
                  <span className="ml-2 text-green-600 text-sm">
                    ✓ Commitment fee paid
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-sm text-gray-600">Booking ID</span>
              <p className="font-mono text-xs text-gray-800">
                {bookingId.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span>Created: {new Date(status.created_at).toLocaleDateString()}</span>
              <span>Appointment: {new Date(status.slot_start).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex gap-3">
              <button
                onClick={fetchBookingStatus}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Refresh Status
              </button>
              
              {status.status === 'confirmed' && (
                <button
                  onClick={(evt) => {
                    evt.preventDefault();
                    router.push(`/confirm/${bookingId}`);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  View Details
                </button>
              )}
            </div>
            
            {/* Phone-only cancellation notice */}
            {canCancel && (
              <BookingActions 
                booking={{
                  id: bookingId,
                  status: status.status,
                  vendorPhone: "+1234567890",
                  vendor_id: "placeholder",
                  service_id: "placeholder",
                  customer_id: "placeholder"
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import RefundOverride from '@/components/admin/RefundOverride'

interface BookingDetail {
  id: string
  customer_id: string
  vendor_id: string
  status: string
  service_name: string
  scheduled_for: string
  amount_cents: number
  created_at: string
  updated_at: string
  customer_email?: string
  customer_name?: string
  vendor_name?: string
  vendor_email?: string
  notes?: string
  has_hold?: boolean
  hold_expires_at?: string
  reschedule_token?: string
}

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: (reason: string) => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  dangerous?: boolean
}

function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  dangerous = false 
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(reason)
    setReason('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason (required)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            rows={3}
            placeholder="Enter reason for this action..."
            required
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className={`flex-1 px-4 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              dangerous 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BookingDetailAdmin() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    action: string
  }>({ isOpen: false, title: '', message: '', action: '' })

  useEffect(() => {
    loadBooking()
  }, [bookingId])

  const loadBooking = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`)
      if (response.ok) {
        const data = await response.json()
        setBooking(data)
      } else {
        console.error('Booking not found')
        router.push('/admin/bookings')
      }
    } catch (error) {
      console.error('Error loading booking:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string, reason: string) => {
    setActionLoading(action)
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      })

      if (response.ok) {
        await loadBooking() // Refresh data
        setDialog({ isOpen: false, title: '', message: '', action: '' })
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Action failed'}`)
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error)
      alert(`Error performing ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const openDialog = (action: string, title: string, message: string) => {
    setDialog({ isOpen: true, title, message, action })
  }

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading booking details...</span>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Booking not found</p>
      </div>
    )
  }

  const canCancel = ['pending', 'confirmed'].includes(booking.status)
  const canReleaseHold = booking.has_hold && booking.status !== 'cancelled'
  const canMarkNoShow = ['confirmed'].includes(booking.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
          <p className="text-sm text-gray-600">ID: {booking.id}</p>
        </div>
        <button
          onClick={() => router.push('/admin/bookings')}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400"
        >
          Back to Bookings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Booking Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {booking.status.toUpperCase()}
                </span>
                {booking.has_hold && (
                  <span className="ml-2 px-2 py-1 text-xs rounded-full font-medium bg-orange-100 text-orange-800">
                    HOLD
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Service</dt>
              <dd className="text-sm text-gray-900 mt-1">{booking.service_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Amount</dt>
              <dd className="text-sm text-gray-900 mt-1">{formatCurrency(booking.amount_cents)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Scheduled For</dt>
              <dd className="text-sm text-gray-900 mt-1">{formatDateTime(booking.scheduled_for)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900 mt-1">{formatDateTime(booking.created_at)}</dd>
            </div>
            {booking.hold_expires_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Hold Expires</dt>
                <dd className="text-sm text-gray-900 mt-1">{formatDateTime(booking.hold_expires_at)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Customer & Vendor */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Customer</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900 mt-1">{booking.customer_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900 mt-1">{booking.customer_email || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ID</dt>
                <dd className="text-sm text-gray-900 mt-1 font-mono">{booking.customer_id}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Vendor</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900 mt-1">{booking.vendor_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900 mt-1">{booking.vendor_email || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ID</dt>
                <dd className="text-sm text-gray-900 mt-1 font-mono">{booking.vendor_id}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Admin Actions</h2>
        <div className="flex flex-wrap gap-3">
          {canCancel && (
            <button
              onClick={() => openDialog(
                'cancel',
                'Cancel Booking',
                'This will cancel the booking. The $1 commitment fee is non-refundable per policy.'
              )}
              disabled={actionLoading === 'cancel'}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Booking'}
            </button>
          )}

          {canReleaseHold && (
            <button
              onClick={() => openDialog(
                'release_hold',
                'Release Hold',
                'This will release any hold on this booking and make it available for normal processing.'
              )}
              disabled={actionLoading === 'release_hold'}
              className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm hover:bg-orange-700 disabled:opacity-50"
            >
              {actionLoading === 'release_hold' ? 'Releasing...' : 'Release Hold'}
            </button>
          )}

          {canMarkNoShow && (
            <button
              onClick={() => openDialog(
                'mark_no_show',
                'Mark as No Show',
                'This will mark the booking as a no-show. Use this for dispute resolution.'
              )}
              disabled={actionLoading === 'mark_no_show'}
              className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 disabled:opacity-50"
            >
              {actionLoading === 'mark_no_show' ? 'Marking...' : 'Mark No Show'}
            </button>
          )}
        </div>

        {/* Refund Override (existing component) */}
        {booking.status !== 'cancelled' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-3">Payment Override</h3>
            <RefundOverride bookingId={booking.id} />
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        onConfirm={(reason) => handleAction(dialog.action, reason)}
        onCancel={() => setDialog({ isOpen: false, title: '', message: '', action: '' })}
        dangerous={['cancel', 'mark_no_show'].includes(dialog.action)}
      />
    </div>
  )
}

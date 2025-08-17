'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../../hooks/useAuth'
import { useParams } from 'next/navigation'
import { generateGoogleCalendarLink, generateAppleCalendarLink, generateOutlookCalendarLink, downloadICS } from '@/lib/calendar/icsGenerator'

interface Booking {
  id: string
  customer_id: string
  vendor_id: string
  service_id: string
  slot_start: string
  slot_end: string
  status: string
  total_amount_cents: number
  commitment_fee_paid: boolean
  notes?: string
  services: { name: string; description: string; duration_minutes: number }
  vendors: { full_name: string; email: string }
  customers: { full_name: string; email: string }
  location?: string
}

export default function ConfirmationPage() {
  const params = useParams<{ bookingId: string }>()
  const bookingId = params?.bookingId ?? ''
  const { user } = useAuth()
  
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookingId) return;
    const fetchBooking = async () => {
      try {
        // Prefer direct GET by id to avoid auth dependency in confirmation view
        const response = await fetch(`/api/bookings/${bookingId}`)
        if (response.ok) {
          const result = await response.json()
          setBooking(result)
        } else if (user) {
          // Fallback for legacy path
          const fallback = await fetch(`/api/bookings/user?userId=${user.id}&bookingId=${bookingId}`)
          const data = await fallback.json()
          if (data.success && data.booking) setBooking(data.booking)
        }
      } catch (error) {
        console.error('Error fetching booking:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchBooking()
  }, [bookingId, user])

  if (!bookingId) {
    return <div className="p-8 text-red-600">Invalid booking id</div>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading confirmation</div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Booking not found</div>
      </div>
    )
  }

  const isConfirmed = booking.status === 'confirmed' && booking.commitment_fee_paid
  const bookingDate = new Date(booking.slot_start)
  const endDate = new Date(booking.slot_end)

  const addToCalendar = (type: 'google' | 'apple' | 'ics' | 'outlook') => {
    if (!booking) return
    
    const event = {
      summary: `Appointment with ${booking.vendors?.full_name}`,
      description: `Service: ${booking.services?.name}\nProvider: ${booking.vendors?.full_name}\nLocation: ${booking.location || 'Contact provider for details'}`,
      location: booking.location || 'Contact provider for details',
      startTime: bookingDate,
      endTime: endDate,
      organizer: { name: booking.vendors?.full_name || 'Provider' }
    }
    
    switch (type) {
      case 'google':
        window.open(generateGoogleCalendarLink(event), '_blank')
        break
      case 'apple':
        window.open(generateAppleCalendarLink(event), '_blank')
        break
      case 'ics':
        downloadICS(event, `appointment-${booking.id}.ics`)
        break
      case 'outlook':
        window.open(generateOutlookCalendarLink(event), '_blank')
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center" data-testid="confirm-heading">
              Booking Confirmed! 🎉
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Confirm your booking details. You&apos;ll be charged a $1 commitment fee to secure your appointment.
            </p>
          </div>

          {/* Booking Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">Booking Details</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-gray-600 block">Service</span>
                  <span className="font-semibold text-lg">{booking.services?.name}</span>
                  {booking.services?.description && (
                    <p className="text-gray-600 text-sm mt-1">{booking.services.description}</p>
                  )}
                </div>
                
                <div>
                  <span className="text-gray-600 block">Provider</span>
                  <span className="font-semibold">{booking.vendors?.full_name}</span>
                  <p className="text-gray-600 text-sm">{booking.vendors?.email}</p>
                </div>

                <div>
                  <span className="text-gray-600 block">Duration</span>
                  <span className="font-semibold">{booking.services?.duration_minutes} minutes</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-gray-600 block">Date</span>
                  <span className="font-semibold text-lg">
                    {bookingDate.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div>
                  <span className="text-gray-600 block">Time</span>
                  <span className="font-semibold text-lg">
                    {bookingDate.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {endDate.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>

                <div>
                  <span className="text-gray-600 block">Status</span>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    isConfirmed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isConfirmed ? 'Confirmed' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-6 pt-6 border-t">
                <span className="text-gray-600 block mb-2">Notes</span>
                <p className="text-gray-800">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-lg mb-4 text-blue-900">What happens next?</h3>
            <div className="space-y-3 text-blue-800">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</div>
                <div>
                  <p className="font-medium">Provider receives your booking</p>
                  <p className="text-sm text-blue-700">They&apos;ll receive an immediate notification with your details</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</div>
                <div>
                  <p className="font-medium">Contact details exchanged</p>
                  <p className="text-sm text-blue-700">You&apos;ll both receive each other&apos;s contact information to coordinate</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</div>
                <div>
                  <p className="font-medium">Enjoy your service</p>
                  <p className="text-sm text-blue-700">Show up on time and enjoy your appointment!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border-t pt-6 mb-8">
            <h3 className="font-semibold text-lg mb-4">Payment Summary</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Commitment Fee Paid</span>
              <span className="font-bold text-green-600">
                ${(booking.total_amount_cents / 100).toFixed(2)} ✓
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              This fee guarantees your spot and reduces no-shows. The provider will collect payment for the full service separately.
            </p>
          </div>

          {/* Calendar Links */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-lg mb-4 text-blue-900">Add to Calendar</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => addToCalendar('google')}
                className="flex-1 bg-white border border-blue-200 text-blue-700 py-3 px-4 rounded-lg text-center hover:bg-blue-50 transition-colors"
                data-testid="ics-google"
              >
                📅 Add to Google Calendar
              </button>
              <button 
                onClick={() => addToCalendar('apple')}
                className="flex-1 bg-white border border-blue-200 text-blue-700 py-3 px-4 rounded-lg text-center hover:bg-blue-50 transition-colors"
                data-testid="ics-apple"
              >
                🍎 Add to Apple Calendar
              </button>
              <button 
                onClick={() => addToCalendar('ics')}
                className="flex-1 bg-white border border-blue-200 text-blue-700 py-3 px-4 rounded-lg text-center hover:bg-blue-50 transition-colors"
                data-testid="ics-outlook"
              >
                🪟 Add to Outlook
              </button>
              <button 
                onClick={() => addToCalendar('ics')}
                className="flex-1 bg-white border border-blue-200 text-blue-700 py-3 px-4 rounded-lg text-center hover:bg-blue-50 transition-colors"
                data-testid="add-to-calendar-ics"
              >
                📥 Download .ics File
              </button>
            </div>
          </div>

          {/* Provider Contact */}
          <div className="mb-8 p-6 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-lg mb-4 text-green-900">Provider Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-green-700 font-medium">Provider:</span>
                <span className="text-green-800">{booking.vendors?.full_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-700 font-medium">Email:</span>
                <a 
                  href={`mailto:${booking.vendors?.email}`}
                  className="text-green-800 hover:underline"
                >
                  {booking.vendors?.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-700 font-medium">Phone:</span>
                <a 
                  href={`tel:+1234567890`}
                  className="text-green-800 hover:underline"
                  data-testid="call-provider-link"
                >
                  +1 (234) 567-8900
                </a>
              </div>
              <p className="text-sm text-green-600 mt-2">
                Need to change your booking? Call the provider directly using the phone number above.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={async () => {
                try {
                  const rebookPath = (process.env.NODE_ENV !== 'production' ? `/api/test/bookings/${bookingId}/rebook` : `/api/bookings/${bookingId}/rebook`)
                  const res = await fetch(rebookPath, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idempotencyKey: `rebook-${Date.now()}` }) })
                  if (res.ok) {
                    const json = await res.json().catch(() => ({}) as Record<string, unknown>)
                    if (json?.booking_id) {
                      window.location.href = `/confirm/${json.booking_id}`
                    } else {
                      const toast = document.querySelector('[data-testid="rebook-toast"]') as HTMLElement | null
                      if (toast) toast.hidden = false
                    }
                  }
                } catch {}
              }}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold text-center hover:shadow-lg transition-shadow"
              data-testid="btn-rebook"
            >
              Rebook
            </button>
            <button 
              onClick={() => window.print()}
              className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Print Confirmation
            </button>
          </div>

          {/* Rebook toast/signals */}
          <div role="status" aria-live="polite" data-testid="rebook-toast" hidden />

          {/* Booking Reference */}
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-gray-500">
              Booking Reference: <span className="font-mono font-semibold">{booking.id}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 
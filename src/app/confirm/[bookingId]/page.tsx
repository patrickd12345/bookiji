'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '../../../../hooks/useAuth'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BookingActions from '@/components/booking/BookingActions'

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
  vendors: { full_name: string; email: string; phone?: string }
  customers: { full_name: string; email: string; phone?: string }
}

function ConfirmationPageContent() {
  const params = useParams<{ bookingId: string }>()
  const bookingId = params?.bookingId ?? ''
  const searchParams = useSearchParams()
  const notice = searchParams.get('notice')
  const { user } = useAuth()
  
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookingId || !user) return;
    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/bookings/user?userId=${user.id}&bookingId=${bookingId}`);
        const data = await response.json();
        if (data.success) {
          setBooking(data.booking);
        }
      } catch (_error) {
        // Error fetching booking
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId, user]);

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

  const isConfirmed = booking.status === 'confirmed'
  const bookingDate = new Date(booking.slot_start)
  const endDate = new Date(booking.slot_end)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Review your booking details and keep this confirmation for your records.
            </p>
          </div>

          {notice === 'call-to-change' && (
            <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
              To change or cancel, call using the phone number on your confirmation. Bookiji doesn’t offer in-app cancellations.
            </div>
          )}

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
                  {booking.vendors?.phone && (
                    <p className="text-gray-600 text-sm">Phone: {booking.vendors.phone}</p>
                  )}
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

          <BookingActions
            providerName={booking.vendors?.full_name}
            providerPhone={booking.vendors?.phone}
            customerPhone={booking.customers?.phone}
          />

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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/"
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold text-center hover:shadow-lg transition-shadow"
            >
              Book Another Service
            </Link>
            <button 
              onClick={() => window.print()}
              className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Print Confirmation
            </button>
          </div>

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

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading confirmation</div>
      </div>
    }>
      <ConfirmationPageContent />
    </Suspense>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../../hooks/useAuth'
import { useParams, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Booking {
  id: string
  customer_id: string
  vendor_id: string
  service_id: string
  slot_start: string
  slot_end: string
  status: string
  total_amount_cents: number
  services: { name: string }
  vendors: { full_name: string }
}

function PaymentForm({ clientSecret, bookingId }: { clientSecret: string, bookingId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      }
    })

    if (result.error) {
      setError(result.error.message || 'Payment failed')
    } else {
      setSuccess(true)
      // Redirect to confirmation page
      setTimeout(() => {
        window.location.href = `/confirm/${bookingId}`
      }, 2000)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-6xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
        <p className="text-gray-600">Redirecting to confirmation...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
        <div className="p-4 border border-gray-300 rounded-md">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
      >
        {loading ? 'Processing...' : 'Pay $1.00 Commitment Fee'}
      </button>

      <p className="text-sm text-gray-500 text-center">
        This $1.00 commitment fee ensures serious bookings and reduces no-shows.
      </p>
    </form>
  )
}

export default function PaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const bookingId = params.bookingId as string
  const clientSecret = searchParams.get('client_secret')
  const { user } = useAuth()
  
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/bookings/user?userId=${user.id}&bookingId=${bookingId}`)
        const data = await response.json()
        setBooking(data.booking)
      } catch (error) {
        console.error('Error fetching booking:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId, user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading payment details...</div>
      </div>
    )
  }

  if (!booking || !clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Booking or payment details not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Complete Your Booking
          </h1>

          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-lg mb-4">Booking Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Service:</span>
                <span className="font-medium">{booking.services?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Provider:</span>
                <span className="font-medium">{booking.vendors?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date & Time:</span>
                <span className="font-medium">
                  {new Date(booking.slot_start).toLocaleDateString()} at{' '}
                  {new Date(booking.slot_start).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-4">
                <span className="text-gray-600">Commitment Fee:</span>
                <span className="font-bold">${(booking.total_amount_cents / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <Elements stripe={stripePromise}>
            <PaymentForm clientSecret={clientSecret} bookingId={bookingId} />
          </Elements>
        </div>
      </div>
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StripePayment from './StripePayment'

interface BookingPaymentModalProps {
  isOpen: boolean
  onCloseAction: () => void
  bookingDetails: {
    id: string
    service: string
    provider: string
    date: string
    time: string
    customerId: string
  } | null
}

export default function BookingPaymentModal({ 
  isOpen, 
  onCloseAction, 
  bookingDetails 
}: BookingPaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && bookingDetails) {
      createPaymentIntent()
    }
  }, [isOpen, bookingDetails])

  const createPaymentIntent = async () => {
    if (!bookingDetails) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: bookingDetails.customerId,
          bookingId: bookingDetails.id,
          serviceDetails: {
            service: bookingDetails.service,
            provider: bookingDetails.provider,
            date: bookingDetails.date,
            time: bookingDetails.time,
          },
        }),
      })

      const data = await response.json()

      if (data.success) {
        setClientSecret(data.clientSecret)
      } else {
        throw new Error(data.error || 'Failed to create payment intent')
      }
    } catch (error) {
      console.error('Payment intent creation error:', error)
      setError(error instanceof Error ? error.message : 'Failed to create payment intent')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPaymentSuccess(true)
    console.log('Payment successful:', paymentIntentId)
    
    // Close modal after a short delay
    setTimeout(() => {
      onCloseAction()
      setPaymentSuccess(false)
      setClientSecret('')
    }, 2000)
  }

  const handlePaymentError = (error: string) => {
    setError(error)
  }

  const handleCancel = () => {
    onCloseAction()
    setClientSecret('')
    setError('')
    setPaymentSuccess(false)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Success State */}
          {paymentSuccess && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-lg p-8 text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Booking Confirmed!
              </h3>
              <p className="text-gray-600 mb-4">
                Your $1 commitment fee has been processed successfully.
              </p>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  You'll receive booking details and provider contact information shortly.
                </p>
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && !clientSecret && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Preparing Payment
              </h3>
              <p className="text-gray-600">
                Setting up your secure payment form...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !clientSecret && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">❌</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Payment Setup Failed
              </h3>
              <p className="text-gray-600 mb-4">
                {error}
              </p>
              <button
                onClick={createPaymentIntent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Payment Form */}
          {clientSecret && bookingDetails && !paymentSuccess && (
            <StripePayment
              clientSecret={clientSecret}
              bookingId={bookingDetails.id}
              serviceDetails={{
                service: bookingDetails.service,
                provider: bookingDetails.provider,
                date: bookingDetails.date,
                time: bookingDetails.time,
              }}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onCancel={handleCancel}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 
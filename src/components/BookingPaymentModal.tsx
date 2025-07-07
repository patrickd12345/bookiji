'use client'

import { useState, useEffect, useCallback } from 'react'
import { FormEvent } from 'react'
import { motion } from 'framer-motion'
import StripePayment from './StripePayment'

interface ServiceDetails {
  name: string
  price: number
  duration: number
  description?: string
}

interface BookingPaymentModalProps {
  isOpen: boolean
  onCloseAction: () => void
  onPaymentSuccessAction: (paymentId: string) => void
  onPaymentErrorAction: (error: Error) => void
  serviceDetails: ServiceDetails
  bookingId: string
}

export function BookingPaymentModal({
  isOpen,
  onCloseAction,
  onPaymentSuccessAction,
  onPaymentErrorAction,
  serviceDetails = {
    name: '',
    price: 0,
    duration: 0
  },
  bookingId
}: BookingPaymentModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const createPaymentIntent = useCallback(async () => {
    try {
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: serviceDetails.price }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent')
      }

      setClientSecret(data.clientSecret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment setup failed')
      onPaymentErrorAction(err instanceof Error ? err : new Error('Payment setup failed'))
    }
  }, [serviceDetails.price, onPaymentErrorAction])

  useEffect(() => {
    if (isOpen && serviceDetails.price > 0) {
      createPaymentIntent()
    }
  }, [isOpen, createPaymentIntent])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    try {
      // Payment processing logic here
      onPaymentSuccessAction('dummy_payment_intent_id') // This will be replaced by actual payment intent ID
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      onPaymentErrorAction(err instanceof Error ? err : new Error('Payment failed'))
    }
  }

  const handlePaymentSuccess = (paymentId: string) => {
    onPaymentSuccessAction(paymentId)
    onCloseAction()
  }

  const handlePaymentError = (error: string | Error) => {
    onPaymentErrorAction(error instanceof Error ? error : new Error(error))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Payment</h2>
          <button
            onClick={onCloseAction}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Amount</h3>
            <p className="text-3xl font-bold text-green-600">
              ${(serviceDetails.price / 100).toFixed(2)}
            </p>
          </div>

          <div className="mb-4">
            <p className="font-medium">{serviceDetails.name}</p>
            <p className="text-gray-600">${serviceDetails.price}</p>
            <p className="text-sm text-gray-500">{serviceDetails.duration} minutes</p>
            {serviceDetails.description && (
              <p className="text-sm text-gray-500 mt-2">{serviceDetails.description}</p>
            )}
          </div>

          {clientSecret ? (
            <div className="space-y-4">
              <StripePayment
                clientSecret={clientSecret}
                bookingId={bookingId}
                serviceDetails={{
                  service: serviceDetails.name,
                  provider: 'Provider Name', // This should come from props
                  date: new Date().toISOString().split('T')[0],
                  time: '12:00' // This should come from props
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={onCloseAction}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCloseAction}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Pay Now
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
} 
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import CreditBooklet from './CreditBooklet'

interface EnhancedPaymentModalProps {
  isOpen: boolean
  onCloseAction: () => void
  bookingDetails: {
    id: string
    service: string
    provider: string
    date: string
    time: string
    customerId: string
    amountCents: number
  }
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function EnhancedPaymentModal({
  isOpen,
  onCloseAction,
  bookingDetails,
  onSuccess,
  onError
}: EnhancedPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [showCreditBooklet, setShowCreditBooklet] = useState(false)

  // Move these up so they're declared before useEffect
  const createPaymentIntent = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: bookingDetails.amountCents }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent')
      }

      setClientSecret(data.clientSecret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment setup failed')
      onError?.(err instanceof Error ? err : new Error('Payment setup failed'))
    } finally {
      setLoading(false)
    }
  }, [bookingDetails.amountCents, onError])

  useEffect(() => {
    if (isOpen && bookingDetails.amountCents > 0) {
      createPaymentIntent()
    }
  }, [isOpen, bookingDetails.amountCents, createPaymentIntent])


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Payment processing logic here
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      onError?.(err instanceof Error ? err : new Error('Payment failed'))
    } finally {
      setLoading(false)
    }
  }



  const handleCreditBookletClose = () => {
    setShowCreditBooklet(false)
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
              ${(bookingDetails.amountCents / 100).toFixed(2)}
            </p>
          </div>

          {clientSecret ? (
            <div className="space-y-4">
              {/* Stripe Elements would go here */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Pay Now'}
              </button>
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
        </form>

      </motion.div>

      {/* Credit Booklet Modal */}
      <CreditBooklet
        userId={bookingDetails.customerId}
        isOpen={showCreditBooklet}
        onCloseAction={handleCreditBookletClose}
        onCreditsUpdated={() => {
          handleCreditBookletClose()
          onSuccess?.()
        }}
      />
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StripePayment from './StripePayment'
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
  } | null
}

interface UserCredits {
  balance_cents: number
  [key: string]: any
}

export default function EnhancedPaymentModal({ 
  isOpen, 
  onCloseAction, 
  bookingDetails 
}: EnhancedPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'credits' | null>(null)
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null)
  const [clientSecret, setClientSecret] = useState<string>('')
  const [showCreditBooklet, setShowCreditBooklet] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && bookingDetails) {
      fetchUserCredits()
    }
  }, [isOpen, bookingDetails])

  const fetchUserCredits = async () => {
    if (!bookingDetails) return

    try {
      const response = await fetch(`/api/credits/balance?userId=${bookingDetails.customerId}`)
      const data = await response.json()

      if (data.success) {
        setUserCredits(data.credits)
      }
    } catch (error) {
      console.error('Error fetching user credits:', error)
    }
  }

  const handlePaymentMethodSelect = async (method: 'stripe' | 'credits') => {
    setPaymentMethod(method)
    setError('')

    if (method === 'stripe') {
      await createStripePaymentIntent()
    } else if (method === 'credits') {
      await processCreditsPayment()
    }
  }

  const createStripePaymentIntent = async () => {
    if (!bookingDetails) return

    setLoading(true)
    try {
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setLoading(false)
    }
  }

  const processCreditsPayment = async () => {
    if (!bookingDetails) return

    setLoading(true)
    try {
      const response = await fetch('/api/credits/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: bookingDetails.customerId,
          bookingId: bookingDetails.id,
          amountCents: bookingDetails.amountCents,
          description: `Payment for ${bookingDetails.service} booking`
        })
      })

      const data = await response.json()

      if (data.success) {
        handlePaymentSuccess('credits_payment')
      } else {
        throw new Error(data.error || 'Failed to process credit payment')
      }
    } catch (error) {
      console.error('Credit payment error:', error)
      setError(error instanceof Error ? error.message : 'Failed to process credit payment')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPaymentSuccess(true)
    console.log('Payment successful:', paymentIntentId)
    
    // Refresh user credits
    fetchUserCredits()
    
    // Close modal after a short delay
    setTimeout(() => {
      onCloseAction()
      resetModal()
    }, 2000)
  }

  const handlePaymentError = (error: string) => {
    setError(error)
  }

  const resetModal = () => {
    setPaymentMethod(null)
    setClientSecret('')
    setError('')
    setPaymentSuccess(false)
    setShowCreditBooklet(false)
  }

  const handleClose = () => {
    onCloseAction()
    resetModal()
  }

  const canAffordWithCredits = () => {
    if (!userCredits || !bookingDetails) return false
    return userCredits.balance_cents >= bookingDetails.amountCents
  }

  const needsMoreCredits = () => {
    if (!userCredits || !bookingDetails) return 0
    return Math.max(0, bookingDetails.amountCents - userCredits.balance_cents)
  }

  if (!isOpen || !bookingDetails) return null

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleClose}
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
                  Your ${(bookingDetails.amountCents / 100).toFixed(2)} payment has been processed successfully.
                </p>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    You'll receive booking details and provider contact information shortly.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Payment Method Selection */}
            {!paymentMethod && !paymentSuccess && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Choose Payment Method
                  </h3>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="text-xl">×</span>
                  </button>
                </div>

                {/* Booking Summary */}
                <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-medium text-blue-900 mb-2">Booking Summary</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div><span className="font-medium">Service:</span> {bookingDetails.service}</div>
                    <div><span className="font-medium">Provider:</span> {bookingDetails.provider}</div>
                    <div><span className="font-medium">Date:</span> {bookingDetails.date}</div>
                    <div><span className="font-medium">Time:</span> {bookingDetails.time}</div>
                    <div className="border-t pt-2 mt-2">
                      <span className="font-bold">Amount: ${(bookingDetails.amountCents / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Credit Balance Display */}
                {userCredits && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Credit Balance:</span>
                      <span className="font-bold text-green-600">
                        ${(userCredits.balance_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Payment Options */}
                <div className="space-y-3">
                  {/* Credit Card Option */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePaymentMethodSelect('stripe')}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💳</span>
                      <div>
                        <p className="font-medium text-gray-900">Credit Card</p>
                        <p className="text-sm text-gray-500">Pay with card or digital wallet</p>
                      </div>
                    </div>
                  </motion.button>

                  {/* Credits Option */}
                  <motion.button
                    whileHover={canAffordWithCredits() ? { scale: 1.02 } : {}}
                    whileTap={canAffordWithCredits() ? { scale: 0.98 } : {}}
                    disabled={!canAffordWithCredits()}
                    onClick={() => handlePaymentMethodSelect('credits')}
                    className={`w-full p-4 border-2 rounded-xl transition-all text-left ${
                      canAffordWithCredits()
                        ? 'border-green-200 hover:border-green-300 hover:bg-green-50'
                        : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🪙</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Pay with Credits</p>
                        <p className="text-sm text-gray-500">
                          {canAffordWithCredits() 
                            ? 'Use your existing credit balance'
                            : `Need $${(needsMoreCredits() / 100).toFixed(2)} more credits`
                          }
                        </p>
                      </div>
                    </div>
                  </motion.button>

                  {/* Buy More Credits Option */}
                  {!canAffordWithCredits() && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCreditBooklet(true)}
                      className="w-full p-4 border-2 border-purple-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💎</span>
                        <div>
                          <p className="font-medium text-gray-900">Buy More Credits</p>
                          <p className="text-sm text-gray-500">
                            Add ${((needsMoreCredits() / 100) + 5).toFixed(0)}+ to your balance
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Stripe Payment Form */}
            {paymentMethod === 'stripe' && clientSecret && (
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
                onCancel={() => setPaymentMethod(null)}
              />
            )}

            {/* Credits Payment Processing */}
            {paymentMethod === 'credits' && loading && (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Processing Payment
                </h3>
                <p className="text-gray-600">
                  Using your credits to complete this booking...
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Credit Booklet Modal */}
      <CreditBooklet
        userId={bookingDetails.customerId}
        isOpen={showCreditBooklet}
        onCloseAction={() => setShowCreditBooklet(false)}
        onCreditsUpdated={(newBalance) => {
          // Refresh credits and close booklet
          fetchUserCredits()
          setShowCreditBooklet(false)
        }}
      />
    </>
  )
} 
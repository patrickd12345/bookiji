'use client'

import { useState, useEffect } from 'react'
import type { Stripe } from '@stripe/stripe-js'
import { motion } from 'framer-motion'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getStripe } from '../../lib/stripe'

interface StripePaymentProps {
  clientSecret: string
  bookingId: string
  serviceDetails: {
    service: string
    provider: string
    date: string
    time: string
  }
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
  onCancel: () => void
}

function PaymentForm({ 
  bookingId, 
  serviceDetails, 
  onSuccess, 
  onError, 
  onCancel 
}: StripePaymentProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setMessage('')

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/success?booking_id=${bookingId}`,
      },
      redirect: 'if_required',
    })

    if (error) {
      setMessage(error.message || 'Payment failed')
      onError(error.message || 'Payment failed')
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage('Payment successful!')
      onSuccess(paymentIntent.id)
    }

    setIsProcessing(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
          <span className="text-white text-sm">💳</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Booking Commitment Fee</h3>
          <p className="text-sm text-gray-500">Secure payment to guarantee your booking</p>
        </div>
      </div>

      {/* Service Details */}
      <div className="mb-6 p-4 bg-blue-50 rounded-xl">
        <h4 className="font-medium text-blue-900 mb-2">Booking Summary</h4>
        <div className="space-y-1 text-sm text-blue-800">
          <div><span className="font-medium">Service:</span> {serviceDetails.service}</div>
          <div><span className="font-medium">Provider:</span> {serviceDetails.provider}</div>
          <div><span className="font-medium">Date:</span> {serviceDetails.date}</div>
          <div><span className="font-medium">Time:</span> {serviceDetails.time}</div>
        </div>
      </div>

      {/* Payment Amount */}
      <div className="mb-6 p-4 bg-green-50 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-green-800">Commitment Fee</span>
          <span className="text-lg font-bold text-green-700">$1.00</span>
        </div>
        <p className="text-xs text-green-600 mt-1">
          This fee guarantees your booking and reduces no-shows
        </p>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement />
        
        {message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-3 rounded-lg text-sm ${
              message.includes('successful') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message}
          </motion.div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || isProcessing}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Pay $1.00'}
          </button>
        </div>
      </form>

      {/* Security Notice */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>🔒</span>
          <span>Secure payment powered by Stripe</span>
        </div>
      </div>
    </div>
  )
}

// Demo payment component when Stripe is not configured
function DemoPaymentForm(props: StripePaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDemoPayment = () => {
    setIsProcessing(true)
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false)
      props.onSuccess(`pi_demo_${Date.now()}`)
    }, 2000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center">
          <span className="text-white text-sm">⚠️</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Demo Payment Mode</h3>
          <p className="text-sm text-gray-500">Stripe not configured - showing demo interface</p>
        </div>
      </div>

      {/* Service Details */}
      <div className="mb-6 p-4 bg-blue-50 rounded-xl">
        <h4 className="font-medium text-blue-900 mb-2">Booking Summary</h4>
        <div className="space-y-1 text-sm text-blue-800">
          <div><span className="font-medium">Service:</span> {props.serviceDetails.service}</div>
          <div><span className="font-medium">Provider:</span> {props.serviceDetails.provider}</div>
          <div><span className="font-medium">Date:</span> {props.serviceDetails.date}</div>
          <div><span className="font-medium">Time:</span> {props.serviceDetails.time}</div>
        </div>
      </div>

      {/* Payment Amount */}
      <div className="mb-6 p-4 bg-green-50 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-green-800">Commitment Fee</span>
          <span className="text-lg font-bold text-green-700">$1.00</span>
        </div>
        <p className="text-xs text-green-600 mt-1">
          This fee guarantees your booking and reduces no-shows
        </p>
      </div>

      {/* Demo Payment Form */}
      <div className="space-y-4">
        <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">💳</div>
            <p className="text-sm font-medium">Demo Payment Interface</p>
            <p className="text-xs">Configure Stripe keys to enable real payments</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <span>⚡</span>
            <span>Demo Mode: Payment processing is simulated for development</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={props.onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDemoPayment}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Demo Pay $1.00'}
          </button>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <details className="text-sm">
          <summary className="font-medium text-blue-900 cursor-pointer">Setup Instructions</summary>
          <div className="mt-2 text-blue-800 space-y-1">
            <p>To enable real payments:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Create a Stripe account at stripe.com</li>
              <li>Get your publishable and secret keys</li>
              <li>Add them to your .env.local file</li>
              <li>Restart the development server</li>
            </ol>
          </div>
        </details>
      </div>
    </div>
  )
}

export default function StripePayment(props: StripePaymentProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [isStripeConfigured, setIsStripeConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Validate client secret format
  const isValidClientSecret = (clientSecret: string) => {
    // Stripe client secrets should match pattern: pi_xxx_secret_xxx or seti_xxx_secret_xxx
    const clientSecretPattern = /^(pi|seti)_[a-zA-Z0-9]+_secret_[a-zA-Z0-9]+$/
    return clientSecretPattern.test(clientSecret)
  }

  useEffect(() => {
    const initializeStripe = async () => {
      const stripe = getStripe()
      const hasValidClientSecret = isValidClientSecret(props.clientSecret)
      
      setStripePromise(stripe)
      setIsStripeConfigured(!!stripe && hasValidClientSecret)
      setIsLoading(false)
    }
    
    initializeStripe()
  }, [props.clientSecret])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading payment form...</span>
      </div>
    )
  }

  // Show demo mode if Stripe is not configured or client secret is invalid
  if (!isStripeConfigured || !stripePromise || !isValidClientSecret(props.clientSecret)) {
    return <DemoPaymentForm {...props} />
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: props.clientSecret }}>
      <PaymentForm {...props} />
    </Elements>
  )
} 
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSkeleton, ButtonSkeleton } from '@/components/ui/LoadingSkeleton'
import { useOptimisticActionWithTelemetry } from '@/hooks/useOptimisticActionWithTelemetry'
import { useDebouncedClickWithTelemetry } from '@/hooks/useDebouncedClickWithTelemetry'
import { useResilientQuery } from '@/hooks/useResilientQuery'
import { CheckCircle, CreditCard, AlertCircle, Loader2 } from 'lucide-react'

interface PaymentDetails {
  amount: number
  currency: string
  description: string
}

interface ResilientPaymentButtonProps {
  onPaymentSuccessAction: (paymentId: string) => void
  onPaymentErrorAction: (error: Error) => void
  paymentDetails: PaymentDetails
  onSuccess?: (paymentId: string) => void
  onError?: (error: Error) => void
  className?: string
  disabled?: boolean
}

export function ResilientPaymentButton({
  onPaymentSuccessAction,
  onPaymentErrorAction,
  paymentDetails,
  className = '',
  disabled = false
}: ResilientPaymentButtonProps) {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle')
  const [paymentId, setPaymentId] = useState<string | null>(null)

  // 1. OPTIMISTIC PAYMENT ACTION with TELEMETRY
  const { execute: executePayment, status, error, rollback } = useOptimisticActionWithTelemetry({
    action: async (details: PaymentDetails) => {
      // Simulate payment processing
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      })

      if (!response.ok) {
        throw new Error('Payment failed')
      }

      const result = await response.json()
      return result.paymentId
    },
    onOptimistic: (details: PaymentDetails) => {
      setPaymentStatus('processing')
      setPaymentId(null)
    },
    onSuccess: (paymentId: string, details: PaymentDetails) => {
      setPaymentStatus('success')
      setPaymentId(paymentId)
      onPaymentSuccessAction(paymentId)
    },
    onError: (error: Error, details: PaymentDetails) => {
      setPaymentStatus('failed')
      onPaymentErrorAction(error)
    },
    onRollback: (details: PaymentDetails) => {
      setPaymentStatus('idle')
      setPaymentId(null)
    },
    component: 'ResilientPaymentButton' // Required for telemetry
  })

  // 2. DEBOUNCED CLICK (prevents double-payments) with TELEMETRY
  const debouncedPayment = useDebouncedClickWithTelemetry(() => executePayment(paymentDetails), {
    delay: 500,
    onDuplicate: () => {
      console.log('Payment already in progress, ignoring duplicate click')
    },
    component: 'ResilientPaymentButton' // Required for telemetry
  })

  // 3. RESILIENT QUERY for payment status confirmation
  const { data: confirmedPayment, isLoading: isConfirming } = useResilientQuery({
    key: ['payment-confirmation', paymentId || ''],
    fetcher: async () => {
      if (!paymentId) throw new Error('No payment ID')
      
      const response = await fetch(`/api/payments/${paymentId}/status`)
      if (!response.ok) throw new Error('Failed to confirm payment')
      
      return response.json()
    },
    enabled: !!paymentId && paymentStatus === 'success',
    retry: { attempts: 3, backoff: 'exponential', delay: 1000 },
    staleTime: 5000
  })

  // 4. LOADING SKELETONS for different states
  if (status === 'optimistic' || paymentStatus === 'processing') {
    return (
      <div className="space-y-2">
        <ButtonSkeleton size="lg" className="w-full" />
        <div className="text-center">
          <LoadingSkeleton width={120} height={14} />
        </div>
      </div>
    )
  }

  // 5. SUCCESS STATE with confirmation
  if (paymentStatus === 'success') {
    return (
      <div className="space-y-3">
        <Button disabled className="w-full bg-green-600 text-white">
          <CheckCircle className="w-4 h-4 mr-2" />
          Payment Successful!
        </Button>
        
        {isConfirming && (
          <div className="text-center text-sm text-gray-600">
            <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
            Confirming payment...
          </div>
        )}
        
        {confirmedPayment && (
          <div className="text-center text-sm text-green-600">
            ✓ Payment confirmed on blockchain
          </div>
        )}
      </div>
    )
  }

  // 6. ERROR STATE with retry
  if (paymentStatus === 'failed' || error) {
    return (
      <div className="space-y-3">
        <Button 
          onClick={() => debouncedPayment()}
          variant="destructive"
          className="w-full"
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          Payment Failed - Try Again
        </Button>
        
        <div className="text-center text-sm text-red-600">
          {error?.message || 'Something went wrong. Your card was not charged.'}
        </div>
        
        <Button 
          onClick={() => rollback(paymentDetails)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Reset Payment
        </Button>
      </div>
    )
  }

  // 7. DEFAULT STATE - Payment button
  return (
    <Button
      onClick={() => debouncedPayment()}
      disabled={disabled || status === 'loading'}
      className={`w-full ${className}`}
      size="lg"
    >
      <CreditCard className="w-4 h-4 mr-2" />
      Pay {paymentDetails.currency} {paymentDetails.amount}
    </Button>
  )
}

// Specialized payment button for Bookiji's $1 commitment fee
export function BookijiCommitmentButton({
  onSuccess,
  onError,
  className = ''
}: {
  onSuccess: (paymentId: string) => void
  onError: (error: Error) => void
  className?: string
}) {
  return (
    <ResilientPaymentButton
      paymentDetails={{
        amount: 1.00,
        currency: 'USD',
        description: 'Bookiji Commitment Fee'
      }}
      onPaymentSuccessAction={onSuccess}
      onPaymentErrorAction={onError}
      className={className}
    />
  )
}

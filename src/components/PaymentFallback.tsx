"use client"

import { useState } from 'react'
import { AlertTriangle, ArrowLeft, RefreshCw, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/useI18n'
import { Button } from '@/components/ui/button'

interface PaymentFallbackProps {
  bookingId: string
  error?: string
  onRetry?: () => Promise<void>
  onBack?: () => void
}

export function PaymentFallback({ 
  bookingId, 
  error = 'Payment temporarily unavailable',
  onRetry,
  onBack 
}: PaymentFallbackProps) {
  const [retrying, setRetrying] = useState(false)
  const router = useRouter()
  const { t } = useI18n()

  const handleRetry = async () => {
    if (!onRetry) return
    
    setRetrying(true)
    try {
      await onRetry()
    } catch (err) {
      console.error('Retry failed:', err)
    } finally {
      setRetrying(false)
    }
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.push(`/book/${bookingId}`)
    }
  }

  const handleContactSupport = () => {
    router.push('/help?category=payment&issue=payment-unavailable')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('payment.fallback.title', 'Payment Temporarily Unavailable')}
            </h1>
            <p className="text-gray-600 mb-6">
              {error || t('payment.fallback.message', 
                'We\'re experiencing technical difficulties with our payment system. Your booking is safe.'
              )}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-blue-800 text-sm">
              <CreditCard className="w-4 h-4" aria-hidden="true" />
              <span className="font-medium">
                {t('payment.fallback.assurance', 'No charges have been processed')}
              </span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              {t('payment.fallback.booking_safe', 
                'Your booking slot is temporarily reserved while we resolve this issue.'
              )}
            </p>
          </div>

          <div className="space-y-3">
            {onRetry && (
              <Button
                onClick={handleRetry}
                disabled={retrying}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                data-testid="payment-retry-btn"
              >
                {retrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    {t('payment.fallback.retrying', 'Retrying...')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                    {t('payment.fallback.retry', 'Try Again')}
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={handleBack}
              variant="outline"
              className="w-full"
              data-testid="payment-back-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              {t('payment.fallback.back', 'Back to Booking')}
            </Button>

            <Button
              onClick={handleContactSupport}
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-800"
              data-testid="payment-support-btn"
            >
              {t('payment.fallback.contact_support', 'Contact Support')}
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {t('payment.fallback.booking_id', 'Booking ID')}: <code className="bg-gray-100 px-1 rounded">{bookingId}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

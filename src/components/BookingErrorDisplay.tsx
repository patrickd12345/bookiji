'use client'

import { useState } from 'react'

interface BookingErrorDisplayProps {
  error: {
    error: string
    code?: string
    hint?: string
    details?: unknown
  }
  onRetry?: () => void
  onDismiss?: () => void
}

export function BookingErrorDisplay({ error, onRetry, onDismiss }: BookingErrorDisplayProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const isRetryable = error.code && ['NETWORK_ERROR', 'TIMEOUT', 'INTERNAL_ERROR'].includes(error.code)

  return (
    <div
      className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
      role="alert"
      data-test="booking-error"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 mb-1">Booking Error</h3>
          <p className="text-sm mb-2">{error.error}</p>
          {error.hint && (
            <p className="text-xs text-red-700 mb-2">{error.hint}</p>
          )}
          {error.code && (
            <p className="text-xs text-red-600 font-mono">Error Code: {error.code}</p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="ml-4 text-red-600 hover:text-red-800"
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>
      {isRetryable && onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Retry
        </button>
      )}
    </div>
  )
}

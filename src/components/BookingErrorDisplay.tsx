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

  const isRetryable = error.code && ['NETWORK_ERROR', 'TIMEOUT', 'INTERNAL_ERROR', 'BOOKING_CONFLICT'].includes(error.code)
  
  // Special handling for booking conflicts
  const isBookingConflict = error.code === 'BOOKING_CONFLICT'

  return (
    <div
      className={`mb-6 rounded-lg border p-4 ${
        isBookingConflict 
          ? 'border-orange-200 bg-orange-50 text-orange-800' 
          : 'border-red-200 bg-red-50 text-red-800'
      }`}
      role="alert"
      data-test="booking-error"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`font-semibold mb-1 ${isBookingConflict ? 'text-orange-900' : 'text-red-900'}`}>
            {isBookingConflict ? 'Time Slot Unavailable' : 'Booking Error'}
          </h3>
          <p className="text-sm mb-2">{error.error}</p>
          {error.hint && (
            <p className={`text-xs mb-2 ${isBookingConflict ? 'text-orange-700' : 'text-red-700'}`}>
              {error.hint}
            </p>
          )}
          {error.code && !isBookingConflict && (
            <p className="text-xs text-red-600 font-mono">Error Code: {error.code}</p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className={`ml-4 hover:opacity-70 ${
            isBookingConflict ? 'text-orange-600' : 'text-red-600'
          }`}
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>
      {isRetryable && onRetry && (
        <button
          onClick={onRetry}
          className={`mt-3 px-4 py-2 text-white rounded-md transition-colors text-sm font-medium ${
            isBookingConflict
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isBookingConflict ? 'Select Different Time' : 'Retry'}
        </button>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'

interface AsyncWarningProps {
  operation: 'booking' | 'payment' | 'confirmation' | 'cancellation' | 'refund' | 'general'
  isVisible?: boolean
  duration?: number
  onClose?: () => void
  className?: string
  severity?: 'info' | 'warning' | 'error'
}

const OPERATION_CONFIG = {
  booking: {
    title: 'Processing Your Booking',
    message: 'We\'re creating your appointment and coordinating with the provider. This may take a few moments.',
    tips: [
      'Don\'t refresh the page or navigate away',
      'You\'ll receive confirmation once processing is complete',
      'If this takes longer than expected, check your internet connection'
    ],
    icon: '📅'
  },
  payment: {
    title: 'Processing Payment',
    message: 'Your payment is being securely processed. Please wait while we confirm your transaction.',
    tips: [
      'Do not close this window or refresh the page',
      'Processing typically takes 30-60 seconds',
      'You\'ll be redirected automatically once complete'
    ],
    icon: '💳'
  },
  confirmation: {
    title: 'Sending Confirmations',
    message: 'We\'re sending confirmation details to both you and your provider.',
    tips: [
      'Check your email for confirmation details',
      'Provider will receive instant notification',
      'You can safely navigate away after seeing this message'
    ],
    icon: '✉️'
  },
  cancellation: {
    title: 'Processing Cancellation',
    message: 'We\'re cancelling your booking and notifying the provider.',
    tips: [
      'Refunds may take 3-5 business days to process',
      'Both parties will receive cancellation notifications',
      'You\'ll receive an email confirmation shortly'
    ],
    icon: '❌'
  },
  refund: {
    title: 'Processing Refund',
    message: 'Your refund is being processed and will appear in your account soon.',
    tips: [
      'Refunds typically take 3-5 business days',
      'You\'ll receive email confirmation of the refund',
      'Contact support if you don\'t see it within 7 days'
    ],
    icon: '💰'
  },
  general: {
    title: 'Processing Request',
    message: 'Please wait while we process your request.',
    tips: [
      'This operation may take a few moments',
      'Please don\'t refresh or navigate away',
      'You\'ll be notified when complete'
    ],
    icon: '⏳'
  }
}

export default function AsyncWarning({ 
  operation, 
  isVisible = true, 
  duration,
  onClose,
  className = '',
  severity = 'info'
}: AsyncWarningProps) {
  const [visible, setVisible] = useState(isVisible)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setVisible(isVisible)
  }, [isVisible])

  useEffect(() => {
    if (duration && visible) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (100 / (duration / 100))
          if (newProgress >= 100) {
            clearInterval(interval)
            setVisible(false)
            onClose?.()
            return 100
          }
          return newProgress
        })
      }, 100)

      return () => clearInterval(interval)
    }
  }, [duration, visible, onClose])

  if (!visible) return null

  const config = OPERATION_CONFIG[operation]
  const severityStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className={`p-6 border-b ${severityStyles[severity]}`}>
          <div className="flex items-center">
            <div className="text-2xl mr-3">
              {config.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {config.title}
              </h3>
              <p className="text-sm opacity-80">
                {config.message}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {duration && (
          <div className="px-6 pt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}

        {/* Spinning Indicator */}
        {!duration && (
          <div className="px-6 pt-4 flex justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Tips */}
        <div className="p-6">
          <h4 className="font-medium text-gray-800 mb-3">Please note:</h4>
          <ul className="space-y-2">
            {config.tips.map((tip, index) => (
              <li key={index} className="flex items-start text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-4 h-4 mr-2">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <span>
                Having issues? Contact our support team for assistance.
              </span>
            </div>
          </div>
        </div>

        {/* Manual Close Button */}
        {onClose && !duration && (
          <div className="px-6 pb-6">
            <button
              onClick={() => {
                setVisible(false)
                onClose()
              }}
              className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X, AlertCircle, Clock, Users } from 'lucide-react'

interface ShoutOutConsentModalProps {
  isOpen: boolean
  onClose: () => void
  onConsent: () => void
  searchQuery: string
  location: string
  serviceCategory: string
  isLoading?: boolean
}

export default function ShoutOutConsentModal({
  isOpen,
  onClose,
  onConsent,
  searchQuery,
  location,
  serviceCategory,
  isLoading = false
}: ShoutOutConsentModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const consentButtonRef = useRef<HTMLButtonElement>(null)
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null)

  // Focus trap management
  useEffect(() => {
    if (!isOpen) return

    // Store the previously focused element
    setFocusedElement(document.activeElement as HTMLElement)

    // Focus the close button when modal opens
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 100)

    return () => clearTimeout(timer)
  }, [isOpen])

  // Restore focus when modal closes
  useEffect(() => {
    if (!isOpen && focusedElement) {
      focusedElement.focus()
      setFocusedElement(null)
    }
  }, [isOpen, focusedElement])

  // Handle keyboard navigation and escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key === 'Tab') {
        const modal = modalRef.current
        if (!modal) return

        const focusableElements = modal.querySelectorAll(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement?.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Click outside to close
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shout-out-modal-title"
      aria-describedby="shout-out-modal-description"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Users className="h-5 w-5 text-blue-600" aria-hidden="true" />
            </div>
            <h2 
              id="shout-out-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              No Results Found
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Close modal"
            disabled={isLoading}
          >
            <X className="h-5 w-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div 
            id="shout-out-modal-description" 
            className="text-sm text-gray-600 space-y-3"
          >
            <p>
              We couldn't find any providers for <strong>"{searchQuery}"</strong> in <strong>{location}</strong>.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                Try a "Shout-Out" instead
              </h3>
              <p className="text-blue-800 text-sm">
                We can broadcast your request to nearby providers who offer{' '}
                <strong>{serviceCategory || 'this service'}</strong>. They'll respond with 
                personalized offers if they're available.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">How it works:</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  We notify eligible providers within your area
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  They respond with available time slots and pricing
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  You choose the best offer and book instantly
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-yellow-600 mt-0.5" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Privacy & Time Limit</p>
                  <p className="text-yellow-700">
                    Providers only see your general location and service type. 
                    Offers expire in 30 minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            No Thanks
          </button>
          <button
            ref={consentButtonRef}
            onClick={onConsent}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" aria-hidden="true" />
                Creating...
              </>
            ) : (
              'Yes, Send Shout-Out'
            )}
          </button>
        </div>

        {/* Screen reader live region for status updates */}
        <div 
          className="sr-only" 
          role="status" 
          aria-live="polite" 
          aria-atomic="true"
        >
          {isLoading ? 'Creating shout-out request...' : ''}
        </div>
      </div>
    </div>
  )
}

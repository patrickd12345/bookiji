'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VendorPricingPage() {
  const router = useRouter()
  const [isSubmitting] = useState(false)

  const handleGetStarted = () => {
    router.push('/vendor/onboarding')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
            A booking system that doesn&apos;t break under pressure—and proves it.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600">
            One plan. One price. Monthly.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-2">$29</div>
            <div className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8">per month</div>
          </div>

          {/* Outcomes */}
          <div className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-base sm:text-lg font-medium text-gray-900">Fewer no-shows</p>
                <p className="text-sm sm:text-base text-gray-600">Automated reminders and confirmations reduce missed appointments</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-base sm:text-lg font-medium text-gray-900">Safe reschedules</p>
                <p className="text-sm sm:text-base text-gray-600">Atomic reschedule operations prevent double bookings</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-base sm:text-lg font-medium text-gray-900">Zero double bookings</p>
                <p className="text-sm sm:text-base text-gray-600">Proven slot exclusivity under concurrent demand</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleGetStarted}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 sm:py-4 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg touch-manipulation"
          >
            {isSubmitting ? 'Starting...' : 'Get Started'}
          </button>

          <p className="text-center text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4">
            No credit card required to start
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="text-center text-xs sm:text-sm text-gray-600 px-2">
          <p className="break-words">Certified scheduling reliability • 30-day money-back guarantee</p>
        </div>
      </div>
    </div>
  )
}


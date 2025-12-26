'use client'

import Link from 'next/link'

/**
 * Scheduling-focused landing page for sched.bookiji.com
 * Shows scheduling-focused content and links
 */
export default function SchedLandingPage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Bookiji Scheduling
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8">
            Reliable booking system that doesn&apos;t break under pressure
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <Link
            href="/vendor/schedule"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Vendor Schedule</h2>
            <p className="text-gray-600 text-sm">Manage your availability and bookings</p>
          </Link>

          <Link
            href="/vendor/dashboard"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard</h2>
            <p className="text-gray-600 text-sm">View metrics and manage your business</p>
          </Link>

          <Link
            href="/vendor/pricing"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Pricing</h2>
            <p className="text-gray-600 text-sm">Simple, transparent pricing</p>
          </Link>

          <Link
            href="/vendor/dashboard/certification"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Certification</h2>
            <p className="text-gray-600 text-sm">Verify your scheduling reliability</p>
          </Link>
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Scheduling Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900">Zero Double Bookings</p>
                <p className="text-sm text-gray-600">Proven slot exclusivity</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900">Safe Reschedules</p>
                <p className="text-sm text-gray-600">Atomic operations prevent conflicts</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900">Reliability Certified</p>
                <p className="text-sm text-gray-600">5-minute chaos tests verify resilience</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900">Mobile Optimized</p>
                <p className="text-sm text-gray-600">Works perfectly on all devices</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link
            href="/vendor/schedule"
            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-base sm:text-lg touch-manipulation"
          >
            Get Started with Scheduling
          </Link>
        </div>
      </div>
    </div>
  )
}


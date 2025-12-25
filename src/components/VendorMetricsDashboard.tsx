'use client'

import { useState, useEffect } from 'react'
import SchedulingHealthBadge from './SchedulingHealthBadge'
import Link from 'next/link'

interface VendorMetrics {
  activation_completed: boolean
  time_to_first_availability_hours: number | null
  time_to_first_booking_hours: number | null
  reschedule_success_rate: number
  cancel_rebook_rate: number
  certification_runs_count: number
  last_certification_date: string | null
}

interface VendorMetricsDashboardProps {
  vendorId: string
}

export default function VendorMetricsDashboard({ vendorId }: VendorMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<VendorMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [vendorId])

  const loadMetrics = async () => {
    try {
      const response = await fetch(`/api/vendor/metrics?vendor_id=${vendorId}`)
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading metrics...</div>
  }

  if (!metrics) {
    return <div className="text-gray-500">No metrics available</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Scheduling Health Badge */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Scheduling Health</h2>
        <SchedulingHealthBadge vendorId={vendorId} />
        <Link
          href="/vendor/dashboard/certification"
          className="mt-3 sm:mt-4 inline-block text-xs sm:text-sm text-blue-600 hover:text-blue-800 underline touch-manipulation"
        >
          Run certification →
        </Link>
      </div>

      {/* Decision-Informing Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Activation */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Activation</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-600">Status</span>
              <span className={`text-xs sm:text-sm font-medium ${metrics.activation_completed ? 'text-green-600' : 'text-yellow-600'}`}>
                {metrics.activation_completed ? '✓ Completed' : 'Pending'}
              </span>
            </div>
            {metrics.time_to_first_availability_hours !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Time to first availability</span>
                <span className="text-xs sm:text-sm font-medium">
                  {metrics.time_to_first_availability_hours < 24
                    ? `${Math.round(metrics.time_to_first_availability_hours)}h`
                    : `${Math.round(metrics.time_to_first_availability_hours / 24)}d`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Time to First Booking */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">First Booking</h3>
          <div className="space-y-2">
            {metrics.time_to_first_booking_hours !== null ? (
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Time to first booking</span>
                <span className="text-xs sm:text-sm font-medium">
                  {metrics.time_to_first_booking_hours < 24
                    ? `${Math.round(metrics.time_to_first_booking_hours)}h`
                    : `${Math.round(metrics.time_to_first_booking_hours / 24)}d`}
                </span>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-gray-500">No bookings yet</p>
            )}
          </div>
        </div>

        {/* Reschedule Success Rate */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Reschedule Success</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-600">Success rate</span>
              <span className={`text-xs sm:text-sm font-medium ${metrics.reschedule_success_rate >= 0.8 ? 'text-green-600' : metrics.reschedule_success_rate >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                {Math.round(metrics.reschedule_success_rate * 100)}%
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {metrics.reschedule_success_rate >= 0.8
                ? 'Excellent'
                : metrics.reschedule_success_rate >= 0.5
                ? 'Needs improvement'
                : 'Critical'}
            </p>
          </div>
        </div>

        {/* Cancel/Rebook Rate */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Cancel/Rebook</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-600">Rebook rate</span>
              <span className={`text-xs sm:text-sm font-medium ${metrics.cancel_rebook_rate >= 0.5 ? 'text-green-600' : 'text-yellow-600'}`}>
                {Math.round(metrics.cancel_rebook_rate * 100)}%
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {metrics.cancel_rebook_rate >= 0.5
                ? 'Good retention'
                : 'Low retention'}
            </p>
          </div>
        </div>

        {/* Certification Runs */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:col-span-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Reliability Certification</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">Certification runs</span>
            <span className="text-xs sm:text-sm font-medium">{metrics.certification_runs_count}</span>
          </div>
          {metrics.last_certification_date && (
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Last certified: {new Date(metrics.last_certification_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}


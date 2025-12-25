'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SchedulingHealthBadge from '@/components/SchedulingHealthBadge'
import CertificationResultSummary from '@/components/CertificationResultSummary'

interface CertificationResult {
  status: 'pass' | 'fail'
  timestamp: string
  attacks_covered: string[]
  duration_seconds: number
  failure_reason?: string
  snapshot_path?: string
}

export default function CertificationPage() {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<CertificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRunCertification = async () => {
    setIsRunning(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/vendor/run-certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to run certification')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-8 min-h-screen sm:min-h-0">
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
          Scheduling Certification
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          Run a 5-minute reliability test to certify your booking system's resilience.
        </p>

        {/* Health Badge */}
        <div className="mb-4 sm:mb-6">
          <SchedulingHealthBadge />
        </div>

        {/* Certification Button */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={handleRunCertification}
            disabled={isRunning}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg touch-manipulation"
          >
            {isRunning ? 'Running Certification...' : 'Run Scheduling Certification'}
          </button>
          {isRunning && (
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              This will take approximately 5 minutes. Please don't close this page.
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-red-800">{error}</p>
          </div>
        )}

        {/* Result Summary */}
        {result && (
          <CertificationResultSummary result={result} />
        )}
      </div>
    </div>
  )
}


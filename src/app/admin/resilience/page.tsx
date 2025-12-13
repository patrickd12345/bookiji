'use client'

import { ResilienceDashboard } from '@/components/admin/ResilienceDashboard'

export default function ResilienceMonitorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resilience Monitor</h1>
              <p className="text-sm text-gray-600">Real-time monitoring of Bookiji&apos;s resilience patterns</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ResilienceDashboard />
      </div>
    </div>
  )
}


'use client'

import dynamic from 'next/dynamic'
import UserDashboard from '@/components/UserDashboard'

// GuidedTourManager is a client component; dynamic import keeps the server bundle lean
const GuidedTourManager = dynamic(() => import('../../../components/GuidedTourManager'))

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-gray-600">Manage your bookings and account</p>
            </div>
            <div className="flex items-center space-x-4">
              <GuidedTourManager type="customer" />
            </div>
          </div>
        </div>
      </div>

      {/* Use the comprehensive UserDashboard component */}
      <UserDashboard />
    </div>
  )
} 
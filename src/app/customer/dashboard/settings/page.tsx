'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../../hooks/useAuth'
import { useGuidedTour } from '@/components/guided-tours/GuidedTourProvider'
import { settingsConfigurationSteps, settingsConfigurationTourId } from '@/tours/settingsConfiguration'

export default function DashboardSettings() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { startTour, hasCompletedTour } = useGuidedTour()

  const [tab, setTab] = useState<'profile' | 'notifications' | 'preferences' | 'security'>('profile')

  useEffect(() => {
    if (!hasCompletedTour(settingsConfigurationTourId)) {
      startTour(settingsConfigurationTourId, settingsConfigurationSteps)
    }
  }, [hasCompletedTour, startTour])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading…</p>
      </div>
    )
  }

  // Skip auth check during AdSense approval
  if (!user && process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true') {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {/* Tab nav */}
        <div className="flex space-x-4 border-b mb-6">
          {['profile', 'notifications', 'preferences', 'security'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as 'profile' | 'notifications' | 'preferences' | 'security')}
              className={`pb-2 border-b-2 transition-colors ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Panels */}
        {tab === 'profile' && (
          <div data-tour="profile-info">
            <p className="text-sm text-gray-600 mb-4">Profile editing coming soon.</p>
          </div>
        )}

        {tab === 'notifications' && (
          <div data-tour="notifications">
            <p className="text-sm text-gray-600 mb-4">Notification preferences coming soon.</p>
          </div>
        )}

        {tab === 'preferences' && (
          <div data-tour="preferences">
            <p className="text-sm text-gray-600 mb-4">General preferences coming soon.</p>
          </div>
        )}

        {tab === 'security' && (
          <div data-tour="security">
            <p className="text-sm text-gray-600 mb-4">Security settings coming soon.</p>
          </div>
        )}
      </div>
    </div>
  )
} 
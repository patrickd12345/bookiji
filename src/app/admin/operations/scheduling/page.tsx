'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface SchedulingFlag {
  key: string
  value: boolean
  updated_at: string | null
  updated_by: string | null
  reason: string | null
}

export default function SchedulingOperationsPage() {
  const [flag, setFlag] = useState<SchedulingFlag | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState('')
  const [confirmChecked, setConfirmChecked] = useState(false)

  useEffect(() => {
    fetchFlag()
  }, [])

  const fetchFlag = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/system-flags/scheduling')
      if (!response.ok) {
        throw new Error('Failed to fetch scheduling flag')
      }
      const data = await response.json()
      setFlag(data.flag)
    } catch (error) {
      console.error('Error fetching flag:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      alert('Please provide a reason (at least 10 characters)')
      return
    }

    if (!confirmChecked) {
      alert('Please confirm you understand the implications')
      return
    }

    try {
      setToggling(true)
      const newValue = !flag?.value
      const response = await fetch('/api/admin/system-flags/scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: newValue,
          reason: reason.trim()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to toggle scheduling')
      }

      const data = await response.json()
      setFlag(data.flag)
      setShowModal(false)
      setReason('')
      setConfirmChecked(false)
    } catch (error) {
      console.error('Error toggling scheduling:', error)
      alert(error instanceof Error ? error.message : 'Failed to toggle scheduling')
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const isEnabled = flag?.value ?? true
  const lastUpdated = flag?.updated_at ? new Date(flag.updated_at).toLocaleString() : 'Never'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Scheduling Operations</h1>
        <p className="text-gray-600 mt-2">Manage the scheduling kill switch</p>
      </div>

      {/* Status Card */}
      <div className={`rounded-lg border-2 p-6 ${
        isEnabled 
          ? 'border-green-500 bg-green-50' 
          : 'border-red-500 bg-red-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isEnabled ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Scheduling: {isEnabled ? 'Enabled' : 'Disabled'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Last updated: {lastUpdated}
              </p>
              {flag?.reason && (
                <p className="text-sm text-gray-700 mt-2">
                  Reason: {flag.reason}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className={`px-4 py-2 rounded-md font-medium ${
              isEnabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isEnabled ? 'Disable Scheduling' : 'Enable Scheduling'}
          </button>
        </div>
      </div>

      {/* Warning */}
      {!isEnabled && (
        <div className="rounded-lg border-2 border-yellow-500 bg-yellow-50 p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">Scheduling Disabled</h3>
              <p className="text-sm text-yellow-800 mt-1">
                New booking confirmations are blocked. Existing bookings, cancellations, and refunds are unaffected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {isEnabled ? 'Disable Scheduling' : 'Enable Scheduling'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (required, min 10 characters)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="e.g., Investigating booking inconsistency..."
              />
            </div>

            <div className="mb-4">
              <label className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700">
                  I understand that {isEnabled ? 'disabling' : 'enabling'} scheduling will{' '}
                  {isEnabled 
                    ? 'block all new booking confirmations immediately'
                    : 'allow new booking confirmations to proceed'
                  }
                </span>
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setReason('')
                  setConfirmChecked(false)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={toggling}
              >
                Cancel
              </button>
              <button
                onClick={handleToggle}
                disabled={toggling || !reason.trim() || reason.trim().length < 10 || !confirmChecked}
                className={`flex-1 px-4 py-2 rounded-md text-white ${
                  isEnabled
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {toggling ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isEnabled ? 'Disabling...' : 'Enabling...'}
                  </span>
                ) : (
                  isEnabled ? 'Disable' : 'Enable'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


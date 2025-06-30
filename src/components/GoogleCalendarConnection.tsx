'use client'

import { useState, useEffect } from 'react'
import { Calendar, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'

interface GoogleCalendarConnectionProps {
  profileId: string
  onConnectionChange?: (isConnected: boolean) => void
}

interface ConnectionInfo {
  connectedAt: string
  expiresAt: string
  isExpired: boolean
}

export default function GoogleCalendarConnection({ 
  profileId, 
  onConnectionChange 
}: GoogleCalendarConnectionProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    checkConnectionStatus()
  }, [profileId])

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/auth/google/status?profileId=${profileId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check connection status')
      }

      setIsConnected(data.isConnected)
      setConnectionInfo(data.connectionInfo)
      onConnectionChange?.(data.isConnected)
    } catch (error: any) {
      console.error('Error checking Google Calendar status:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = () => {
    // Redirect to Google OAuth flow
    window.location.href = '/api/auth/google'
  }

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect Google Calendar')
      }

      setIsConnected(false)
      setConnectionInfo(null)
      setSuccessMessage('Google Calendar disconnected successfully')
      onConnectionChange?.(false)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error: any) {
      console.error('Error disconnecting Google Calendar:', error)
      setError(error.message)
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleTestSync = async () => {
    try {
      setError(null)
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sync test failed')
      }

      setSuccessMessage('Calendar sync test successful!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error: any) {
      console.error('Error testing calendar sync:', error)
      setError(error.message)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-gray-400" />
          <div>
            <h3 className="font-semibold text-gray-900">Google Calendar Integration</h3>
            <p className="text-sm text-gray-500">Checking connection status...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Google Calendar Integration</h3>
            <div className="flex items-center space-x-2 mt-1">
              {isConnected ? (
                <>
                  {connectionInfo?.isExpired ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-orange-600">Connection expired</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">Connected</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Not connected</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isConnected ? (
            <>
              <button
                onClick={handleTestSync}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                Test Sync
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <span>Connect Google Calendar</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Connection Details */}
      {isConnected && connectionInfo && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Connected:</span>
              <span className="ml-2 text-gray-900">
                {new Date(connectionInfo.connectedAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Token expires:</span>
              <span className={`ml-2 ${connectionInfo.isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                {new Date(connectionInfo.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          {connectionInfo.isExpired && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-700">
                Your Google Calendar connection has expired. Please reconnect to continue syncing your availability.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Help Text */}
      {!isConnected && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Connect your Google Calendar to automatically sync your availability. 
            We only request read-only access and you can disconnect at any time.
          </p>
        </div>
      )}
    </div>
  )
} 
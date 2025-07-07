'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface GoogleCalendarConnectionProps {
  profileId: string
  onConnectionChange?: (isConnected: boolean) => void
}

interface ConnectionInfo {
  connectedAt: string
  expiresAt: string
  isExpired: boolean
  googleEmail: string
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
  const [isConnecting, setIsConnecting] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    checkConnectionStatus()
  }, [profileId, checkConnectionStatus])

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
    } catch (error: unknown) {
      console.error('Error checking Google Calendar status:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)
    try {
      // Initiate Google OAuth flow via server route
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() || undefined })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to initiate Google Calendar connection')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (err) {
      console.error('Error connecting to Google Calendar:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect to Google Calendar')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect Google Calendar')
      }

      await checkConnectionStatus()
    } catch (err) {
      console.error('Error disconnecting from Google Calendar:', err)
      setError(err instanceof Error ? err.message : 'Failed to disconnect from Google Calendar')
    } finally {
      setIsDisconnecting(false)
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
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">Google Calendar Connection</h3>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Calendar Email (optional)
        </label>
        <Input
          type="email"
          placeholder="Enter calendar email if different from login"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isConnecting || isDisconnecting}
          className="w-full"
        />
        <p className="text-sm text-gray-500">
          Leave blank to use your Google account's primary email
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      <div className="flex space-x-2">
        {!isConnected ? (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
          </Button>
        ) : (
          <Button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            variant="destructive"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect Google Calendar'}
          </Button>
        )}
      </div>

      {/* Connection Details */}
      {isConnected && connectionInfo && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Connected Account:</span>
              <span className="ml-2 text-gray-900">
                {connectionInfo.googleEmail}
              </span>
            </div>
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
            You can use any Google Calendar account - it doesn&apos;t need to match your Bookiji email.
            We only request read-only access and you can disconnect at any time.
          </p>
        </div>
      )}
    </div>
  )
} 
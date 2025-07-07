'use client'

import { useState } from 'react'

interface BusySlot {
  start: string;
  end: string;
}

export default function TestCalendarPage() {
  const [busySlots, setBusySlots] = useState<BusySlot[]>([])
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setIsLoading(true)
    setError(null)
    setBusySlots([])
    setSyncMessage(null)

    // NOTE: We are using your hardcoded profile ID for this test page.
    const profileId = 'c2c3da82-2626-4de4-9260-b5567dc691fe'

    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'An unknown error occurred')
      }

      setSyncMessage(data.message)
      setBusySlots(data.busy || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Calendar Sync Test Page</h1>
        <p className="text-gray-600 mb-6 text-center">
          Click the button to fetch free/busy information from your primary Google Calendar for the next 30 days.
        </p>
        <button
          onClick={handleSync}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
        >
          {isLoading ? 'Syncing...' : 'Fetch Free/Busy Info'}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {syncMessage && (
           <div className="mt-6 p-4 bg-green-100 text-green-700 border border-green-200 rounded-lg">
            <p className="font-bold">Success:</p>
            <p>{syncMessage}</p>
          </div>
        )}

        {busySlots.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Found Busy Slots:</h2>
            <ul className="divide-y divide-gray-200 border rounded-lg">
              {busySlots.map((slot, index) => (
                <li key={index} className="p-4">
                  <p className="font-mono text-sm">
                    <strong>Start:</strong> {new Date(slot.start).toLocaleString()}
                  </p>
                  <p className="font-mono text-sm">
                    <strong>End:</strong>   {new Date(slot.end).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
} 
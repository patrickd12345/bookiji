'use client'

import { useState } from 'react'

export default function RefundOverride({ bookingId }: { bookingId: string }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const trigger = async (force: boolean) => {
    setLoading(true)
    await fetch(`/api/bookings/${bookingId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force, reason })
    })
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <textarea
        className="w-full border p-2 rounded"
        placeholder="Reason code"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          disabled={loading}
          onClick={() => trigger(true)}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Force Refund'}
        </button>
        <button
          disabled={loading}
          onClick={() => trigger(false)}
          className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Skip Refund'}
        </button>
      </div>
    </div>
  )
}

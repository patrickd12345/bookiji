'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface ServiceRequest {
  id: string
  service_type: string
  location: string | null
  customer_id: string
}

export default function VendorRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  // In a real application, derive vendorId from auth session
  const vendorId = 'vendor_1'

  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true)
      try {
        // Load vendor profile to determine relevant service type/location
        const { data: profile } = await supabase
          .from('profiles')
          .select('service_type, service_area')
          .eq('id', vendorId)
          .single()

        const { data } = await supabase
          .from('service_requests')
          .select('*')
          .eq('status', 'pending')
          .eq('service_type', profile?.service_type || '')

        setRequests(data || [])
      } catch (err) {
        console.error('Failed to load service requests', err)
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [])

  const respondToRequest = async (id: string) => {
    try {
      const res = await fetch('/api/service-requests/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, vendorId })
      })

      if (res.ok) {
        setRequests((reqs) => reqs.filter((r) => r.id !== id))
      }
    } catch (err) {
      console.error('Failed to respond to request', err)
    }
  }

  if (loading) {
    return <div className="p-4">Loading requests...</div>
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Open Requests</h1>
      {requests.length === 0 ? (
        <p>No matching requests found.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((req) => (
            <li key={req.id} className="border p-4 rounded">
              <p className="font-medium">Service: {req.service_type}</p>
              {req.location && (
                <p className="text-sm text-gray-500">Location: {req.location}</p>
              )}
              <button
                onClick={() => respondToRequest(req.id)}
                className="mt-2 px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Respond
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


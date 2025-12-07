'use client'

import { useState, useEffect } from 'react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'

interface ServiceRequest {
  id: string
  status: string
  details?: string | null
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/service-requests/list')
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (err) {
      console.error('Failed to fetch service requests:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
    const interval = setInterval(fetchRequests, 5000)
    return () => clearInterval(interval)
  }, [])

  const cancelRequest = async (id: string) => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    const { error } = await supabase
      .from('service_requests')
      .update({ status: 'canceled' })
      .eq('id', id)
      .eq('status', 'pending')
    if (error) {
      console.error('Failed to cancel request:', error)
    } else {
      fetchRequests()
    }
  }

  const editRequest = async (id: string) => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    const details = prompt('Update details for this request:')
    if (!details) return
    const { error } = await supabase
      .from('service_requests')
      .update({ details })
      .eq('id', id)
      .eq('status', 'pending')
    if (error) {
      console.error('Failed to update request:', error)
    } else {
      fetchRequests()
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Service Requests</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul className="space-y-4">
          {requests.map(req => (
            <li key={req.id} className="border p-4 rounded">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">Request {req.id}</p>
                  <p className="text-sm text-gray-600">Status: {req.status}</p>
                  {req.details && (
                    <p className="text-sm text-gray-700 mt-1">{req.details}</p>
                  )}
                </div>
                {req.status === 'pending' && (
                  <div className="space-x-2">
                    <button
                      onClick={() => editRequest(req.id)}
                      className="px-2 py-1 bg-blue-600 text-white rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => cancelRequest(req.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
          {requests.length === 0 && (
            <li className="text-gray-600">No service requests found.</li>
          )}
        </ul>
      )}
    </div>
  )
}

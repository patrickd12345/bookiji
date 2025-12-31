'use client'

import { useEffect, useState } from 'react'
import { registerTour } from '@/lib/guidedTourRegistry'
import { useAutoTour } from '@/lib/useAutoTour'
import { logger } from '@/lib/logger'

interface Proposal {
  id: string
  label: string
  vendor_id: string
  business_name: string
  email: string
  phone: string | null
  status: string
  created_at: string
}

export default function ServiceTypeProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  const loadProposals = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/service-types/proposals?status=pending')
      const data = await res.json()
      if (data.ok) setProposals(data.data)
    } catch (e) {
      logger.error('Error loading proposals:', { error: e })
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, action: 'approve' | 'reject') => {
    try {
      await fetch(`/api/admin/service-types/proposals/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      loadProposals()
    } catch (e) {
      logger.error('Error updating proposal status:', { error: e })
    }
  }

  useEffect(() => {
    registerTour({
      id: 'admin-service-types',
      route: '/admin/service-types',
      title: 'Service Type Proposals',
      steps: [
        { target: '[data-tour="proposal-card"]', content: 'Review and approve or reject new service type proposals from providers here.' }
      ]
    })
  }, [])

  useAutoTour()

  useEffect(() => { loadProposals() }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6">Service Type Proposals</h1>
      {loading && <p>Loading…</p>}
      {!loading && proposals.length === 0 && <p>No pending proposals 🎉</p>}
      <div className="space-y-4">
        {proposals.map((p) => (
          <div key={p.id} className="bg-white border rounded shadow p-4" data-tour="proposal-card">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">{p.label}</h3>
              <span className="text-xs text-blue-600">{p.status}</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Submitted by: {p.business_name} ({p.email})</p>
            <p className="text-xs text-gray-400 mb-4">{new Date(p.created_at).toLocaleString()}</p>
            <div className="flex gap-2">
              <button onClick={() => updateStatus(p.id, 'approve')} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Approve</button>
              <button onClick={() => updateStatus(p.id, 'reject')} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 
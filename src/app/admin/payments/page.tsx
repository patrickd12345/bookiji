'use client'
import React, { useEffect, useState } from 'react'

export default function AdminPaymentsPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch('/api/admin/payments', { credentials: 'include' })
        const json = await res.json()
        if (!mounted) return
        if (!res.ok) {
          setError(json?.error || 'Failed to load payments')
          setLoading(false)
          return
        }
        setData(json.data || [])
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message || 'Network error')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-6">Loading payments...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin — Payments</h1>
      <div className="overflow-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Owner</th>
              <th className="p-2 text-left">Booking</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Provider</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.id}</td>
                <td className="p-2">{row.owner_type}:{row.owner_id}</td>
                <td className="p-2">{row.booking_id || '-'}</td>
                <td className="p-2">{row.amount_cents != null ? (row.amount_cents/100).toFixed(2) : '-'}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">{row.external_provider || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


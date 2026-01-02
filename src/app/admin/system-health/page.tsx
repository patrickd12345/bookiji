'use client'
import React, { useEffect, useState } from 'react'

export default function SystemHealthPage() {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch('/api/admin/health', { credentials: 'include' })
        const json = await res.json()
        if (!mounted) return
        if (!res.ok) {
          setError(json?.error || 'Failed to load health')
          setLoading(false)
          return
        }
        setData(json)
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

  if (loading) return <div className="p-6">Loading system health...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin — System Health</h1>
      <pre className="bg-gray-50 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}


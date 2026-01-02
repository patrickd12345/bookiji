'use client'
import React, { useEffect, useState } from 'react'

export default function AdminAbusePage() {
  const [patterns, setPatterns] = useState<any[]>([])
  const [violations, setViolations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [pRes, vRes] = await Promise.all([
          fetch('/api/admin/abuse-patterns', { credentials: 'include' }),
          fetch('/api/admin/abuse/rate-limit-violations', { credentials: 'include' })
        ])
        const pJson = await pRes.json()
        const vJson = await vRes.json()
        if (!mounted) return
        setPatterns(pJson.patterns || pJson.patterns || [])
        setViolations(vJson.data || [])
      } catch (err) {
        // ignore errors for now
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-6">Loading abuse data...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin — Abuse</h1>
      <section className="mb-6">
        <h2 className="text-xl font-semibold">Patterns</h2>
        <pre className="bg-gray-50 p-4 rounded">{JSON.stringify(patterns, null, 2)}</pre>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Recent Rate Limit Violations</h2>
        <pre className="bg-gray-50 p-4 rounded">{JSON.stringify(violations, null, 2)}</pre>
      </section>
    </div>
  )
}


'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { opsGet } from '../../lib/ops-fetch'
import type { MetricSnapshot, MetricsQueryResult } from '../../lib/ops-types'

export default function MetricsAgentPage() {
  const [system, setSystem] = useState<MetricSnapshot | null>(null)
  const [bookings, setBookings] = useState<MetricSnapshot | null>(null)
  const [errors, setErrors] = useState<MetricSnapshot | null>(null)
  const [p95, setP95] = useState<MetricSnapshot | null>(null)
  const [query, setQuery] = useState('')
  const [queryResult, setQueryResult] = useState<MetricsQueryResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const [sys, book, err, latency] = await Promise.all([
          opsGet<MetricSnapshot>('/ops/metrics/system'),
          opsGet<MetricSnapshot>('/ops/metrics/bookings'),
          opsGet<MetricSnapshot>('/ops/metrics/errors'),
          opsGet<MetricSnapshot>('/ops/metrics/p95')
        ])
        if (!mounted) return
        setSystem(sys)
        setBookings(book)
        setErrors(err)
        setP95(latency)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  async function runQuery() {
    if (!query.trim()) return
    const res = await fetch('/api/ops/metrics/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    if (!res.ok) throw new Error('Query failed')
    setQueryResult(await res.json())
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">MetricsAI — System & Booking Metrics</h2>
        <p className="text-slate-400">Read-only view of system, booking, error, and latency metrics.</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading metrics…
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard title="System" snapshot={system} />
          <MetricCard title="Bookings" snapshot={bookings} />
          <MetricCard title="Errors" snapshot={errors} />
          <MetricCard title="P95 Latency" snapshot={p95} />
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-50">Query playground</h3>
          <p className="text-xs text-slate-500">POST /ops/metrics/query</p>
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md bg-slate-950 border border-slate-800 p-2 text-sm text-slate-100"
          rows={3}
          placeholder="Enter metrics query..."
        />
        <button
          onClick={runQuery}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-700 text-slate-100 hover:bg-slate-800"
        >
          Run query
        </button>

        {queryResult && (
          <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
            {queryResult.series?.map((series) => (
              <div key={series.metric} className="space-y-1">
                <p className="text-sm font-semibold text-slate-100">{series.metric}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-200">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="text-left py-1">Timestamp</th>
                        <th className="text-left py-1">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.points.slice(0, 20).map((p, idx) => (
                        <tr key={idx} className="border-t border-slate-800/60">
                          <td className="py-1">{p.timestamp}</td>
                          <td className="py-1">{p.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ title, snapshot }: { title: string; snapshot: MetricSnapshot | null }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="text-xl font-semibold text-slate-50">
        {snapshot ? `${snapshot.value} ${snapshot.unit}` : '—'}
      </p>
      <p className="text-xs text-slate-500">
        {snapshot ? new Date(snapshot.timestamp).toLocaleString() : 'No data'}
      </p>
    </div>
  )
}

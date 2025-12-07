'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { opsGet } from '../../lib/ops-fetch'
import type { LogEntry, LogsQueryResult } from '../../lib/ops-types'

type Tab = 'errors' | 'system' | 'booking'

export default function LogsAgentPage() {
  const [active, setActive] = useState<Tab>('errors')
  const [data, setData] = useState<Record<Tab, LogEntry[]>>({
    errors: [],
    system: [],
    booking: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const [errors, system, booking] = await Promise.all([
          opsGet<LogsQueryResult>('/ops/logs/errors'),
          opsGet<LogsQueryResult>('/ops/logs/system'),
          opsGet<LogsQueryResult>('/ops/logs/booking')
        ])
        if (!mounted) return
        setData({
          errors: errors.entries || [],
          system: system.entries || [],
          booking: booking.entries || []
        })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const entries = data[active] || []

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">LogsAI — Log Streams</h2>
        <p className="text-slate-400">Read-only slices of error, system, and booking logs.</p>
      </header>

      <div className="flex gap-2 text-sm">
        {(['errors', 'system', 'booking'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-3 py-1 rounded-md border ${
              active === tab
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-slate-950 border-slate-900 text-slate-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading logs…
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2 max-h-[600px] overflow-y-auto">
          {entries.slice(-100).reverse().map((entry, idx) => (
            <div key={idx} className="border border-slate-800/80 rounded-md bg-slate-950/60 p-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{entry.level}</span>
                <span>{entry.timestamp}</span>
              </div>
              <p className="text-sm text-slate-100 mt-1">{entry.message}</p>
            </div>
          ))}
          {entries.length === 0 && <p className="text-slate-500 text-sm">No log entries.</p>}
        </div>
      )}
    </div>
  )
}

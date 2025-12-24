'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { opsGet } from '../../lib/ops-fetch'
import type { SLOStatus } from '../../lib/ops-types'

export default function SLOAgentPage() {
  const [slo, setSlo] = useState<SLOStatus[]>([])
  const [filter, setFilter] = useState<'all' | 'ok' | 'warning' | 'breach'>('all')
  const [selected, setSelected] = useState<SLOStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const data = await opsGet<SLOStatus[]>('/ops/slo')
        if (!mounted) return
        setSlo(data)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const filtered = slo.filter((s) => (filter === 'all' ? true : s.status === filter))

  async function openDetails(name: string) {
    try {
      const data = await opsGet<SLOStatus>(`/ops/slo/${name}`)
      setSelected(data)
    } catch {
      setSelected(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">SLOAI — SLO Status</h2>
          <p className="text-slate-400">Read-only overview of all SLOs.</p>
        </div>
        <div className="flex gap-2 text-sm">
          {['all', 'ok', 'warning', 'breach'].map((f) => (
            <button
              key={f}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1 rounded-md border ${
                filter === f
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-slate-950 border-slate-900 text-slate-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading SLOs…
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 overflow-x-auto">
          <table className="w-full text-sm text-slate-200">
            <thead className="text-slate-400">
              <tr>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Current</th>
                <th className="text-left py-2">Target</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.name}
                  className="border-t border-slate-800/60 hover:bg-slate-900 cursor-pointer"
                  onClick={() => openDetails(s.name)}
                >
                  <td className="py-2">{s.name}</td>
                  <td className="py-2 text-slate-100">{s.status}</td>
                  <td className="py-2">{s.currentValue}</td>
                  <td className="py-2">{s.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
          <p className="text-sm text-slate-400">Details</p>
          <p className="text-lg font-semibold text-slate-50">{selected.name}</p>
          <p className="text-slate-200">Status: {selected.status}</p>
          <p className="text-slate-200">Current: {selected.currentValue}</p>
          <p className="text-slate-200">Target: {selected.target}</p>
        </div>
      )}
    </div>
  )
}

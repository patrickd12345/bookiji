'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { opsGet } from '../../lib/ops-fetch'
import type { Incident } from '../../lib/ops-types'

export default function IncidentsAgentPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selected, setSelected] = useState<Incident | null>(null)
  const [severityFilter, setSeverityFilter] = useState<'all' | Incident['severity']>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | Incident['status']>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const data = await opsGet<Incident[]>('/ops/incidents')
        if (!mounted) return
        setIncidents(data)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const filtered = incidents.filter((i) => {
    const severityOk = severityFilter === 'all' ? true : i.severity === severityFilter
    const statusOk = statusFilter === 'all' ? true : i.status === statusFilter
    return severityOk && statusOk
  })

  async function openIncident(id: string) {
    try {
      const data = await opsGet<Incident>(`/ops/incidents/${id}`)
      setSelected(data)
    } catch {
      setSelected(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">IncidentsAI — Triage</h2>
          <p className="text-slate-400">Read-only incident listing.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <SelectFilter
            label="Severity"
            value={severityFilter}
            options={['all', 'low', 'medium', 'high', 'critical']}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(v) => setSeverityFilter(v as any)}
          />
          <SelectFilter
            label="Status"
            value={statusFilter}
            options={['all', 'open', 'monitoring', 'resolved']}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(v) => setStatusFilter(v as any)}
          />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading incidents…
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 overflow-x-auto">
          <table className="w-full text-sm text-slate-200">
            <thead className="text-slate-400">
              <tr>
                <th className="text-left py-2">Title</th>
                <th className="text-left py-2">Severity</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr
                  key={i.id}
                  className="border-t border-slate-800/60 hover:bg-slate-900 cursor-pointer"
                  onClick={() => openIncident(i.id)}
                >
                  <td className="py-2">{i.title}</td>
                  <td className="py-2">{i.severity}</td>
                  <td className="py-2">{i.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
          <p className="text-sm text-slate-400">Incident details</p>
          <p className="text-lg font-semibold text-slate-50">{selected.title}</p>
          <p className="text-slate-200">Severity: {selected.severity}</p>
          <p className="text-slate-200">Status: {selected.status}</p>
          {selected.summary && <p className="text-slate-200">Summary: {selected.summary}</p>}
        </div>
      )}
    </div>
  )
}

function SelectFilter({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: string[]
  onChange: (val: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-slate-300">
      <span className="text-xs text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-md px-2 py-1"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}

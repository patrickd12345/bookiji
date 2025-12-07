'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { opsGet } from '../../lib/ops-fetch'
import type { CiRun, E2eRun } from '../../lib/ops-types'

export default function RegressionAgentPage() {
  const [ciRuns, setCiRuns] = useState<CiRun[]>([])
  const [e2eRuns, setE2eRuns] = useState<E2eRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const [ci, e2e] = await Promise.all([
          opsGet<CiRun[]>('/ops/tests/ci/runs'),
          opsGet<E2eRun[]>('/ops/tests/e2e/runs')
        ])
        if (!mounted) return
        setCiRuns(ci)
        setE2eRuns(e2e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const lastCi = ciRuns[ciRuns.length - 1]
  const lastE2e = e2eRuns[e2eRuns.length - 1]

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">RegressionAI — CI / E2E Runs</h2>
        <p className="text-slate-400">Read-only regression signals from CI and E2E.</p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <SummaryCard title="Last CI run" value={lastCi?.status ?? 'unknown'} />
        <SummaryCard title="Last E2E run" value={lastE2e?.status ?? 'unknown'} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading runs…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <RunsTable title="CI Runs" rows={ciRuns} />
          <RunsTable title="E2E Runs" rows={e2eRuns} />
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="text-xl font-semibold text-slate-50">{value}</p>
    </div>
  )
}

function RunsTable({ title, rows }: { title: string; rows: Array<{ id: string; status: string }> }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 overflow-x-auto">
      <p className="text-sm font-semibold text-slate-100 mb-2">{title}</p>
      <table className="w-full text-sm text-slate-200">
        <thead className="text-slate-400">
          <tr>
            <th className="text-left py-2">ID</th>
            <th className="text-left py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-800/60">
              <td className="py-2">{r.id}</td>
              <td className="py-2">{r.status}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="py-2 text-slate-500" colSpan={2}>
                No runs found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

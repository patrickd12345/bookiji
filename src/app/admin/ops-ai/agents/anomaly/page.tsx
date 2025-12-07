'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { opsGet } from '../../lib/ops-fetch'
import type { AnomalyFinding, AnomalyReport } from '../../lib/ops-types'

export default function AnomalyAgentPage() {
  const [report, setReport] = useState<AnomalyReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const data = await opsGet<AnomalyReport>('/ops/anomaly')
        if (!mounted) return
        setReport(data)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">AnomalyAI — Cross-signal Anomalies</h2>
        <p className="text-slate-400">Read-only anomaly status and findings.</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading anomalies…
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Status</p>
            <p className="text-xl font-semibold text-slate-50">{report?.status ?? 'unknown'}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-sm font-semibold text-slate-100 mb-2">Findings</p>
            <div className="space-y-2">
              {(report?.findings || []).map((f: AnomalyFinding, idx) => (
                <div key={idx} className="rounded-md border border-slate-800 bg-slate-950/60 p-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{f.source}</span>
                    <span>{f.severity}</span>
                  </div>
                  <p className="text-sm text-slate-100 mt-1">{f.message}</p>
                </div>
              ))}
              {(report?.findings || []).length === 0 && (
                <p className="text-slate-500 text-sm">No findings.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

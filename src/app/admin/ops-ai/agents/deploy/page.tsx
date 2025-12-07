'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { opsGet } from '../../lib/ops-fetch'
import type { DeployReadiness, Deployment } from '../../lib/ops-types'

export default function DeployAgentPage() {
  const [readiness, setReadiness] = useState<DeployReadiness | null>(null)
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const [r, d] = await Promise.all([
          opsGet<DeployReadiness>('/ops/deployments/readiness'),
          opsGet<Deployment[]>('/ops/deployments')
        ])
        if (!mounted) return
        setReadiness(r)
        setDeployments(d)
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
        <h2 className="text-2xl font-semibold text-slate-50">DeployAI — Deployments</h2>
        <p className="text-slate-400">Read-only deploy readiness and recent deployments.</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading deployments…
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
            <p className="text-xs text-slate-400">Readiness</p>
            <p className="text-xl font-semibold text-slate-50">{readiness?.status ?? 'unknown'}</p>
            <ul className="text-sm text-slate-200 space-y-1">
              {(readiness?.reasons || []).map((r, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-600" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 overflow-x-auto">
            <table className="w-full text-sm text-slate-200">
              <thead className="text-slate-400">
                <tr>
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Env</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((d) => (
                  <tr key={d.id} className="border-t border-slate-800/60">
                    <td className="py-2">{d.id}</td>
                    <td className="py-2">{d.env}</td>
                    <td className="py-2">{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

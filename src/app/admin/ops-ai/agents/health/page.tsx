'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { opsGet } from '../../lib/ops-fetch'
import type { HealthStatus, ServiceHealth } from '../../lib/ops-types'

export default function HealthAgentPage() {
  const [overall, setOverall] = useState<HealthStatus | null>(null)
  const [db, setDb] = useState<ServiceHealth | null>(null)
  const [cache, setCache] = useState<ServiceHealth | null>(null)
  const [webhooks, setWebhooks] = useState<ServiceHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const [health, dbHealth, cacheHealth, webhookHealth] = await Promise.all([
          opsGet<HealthStatus>('/ops/health'),
          opsGet<ServiceHealth>('/ops/health/db'),
          opsGet<ServiceHealth>('/ops/health/cache'),
          opsGet<ServiceHealth>('/ops/health/webhooks')
        ])
        if (!mounted) return
        setOverall(health)
        setDb(dbHealth)
        setCache(cacheHealth)
        setWebhooks(webhookHealth)
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
        <h2 className="text-2xl font-semibold text-slate-50">HealthAI — Subsystem Health</h2>
        <p className="text-slate-400">Read-only health posture across core services.</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading health signals…
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Overall health</p>
                <p className="text-xl font-semibold text-slate-50">{overall?.overall ?? 'unknown'}</p>
              </div>
              <p className="text-xs text-slate-500">Services: {overall?.services?.length ?? 0}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <ServiceCard title="Database" health={db} />
            <ServiceCard title="Cache" health={cache} />
            <ServiceCard title="Webhooks" health={webhooks} />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-sm font-semibold text-slate-100 mb-2">All services</p>
            <div className="grid gap-2 md:grid-cols-2">
              {(overall?.services || []).map((svc) => (
                <div key={svc.name} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/50 p-2">
                  <span className="text-slate-200">{svc.name}</span>
                  <span className="text-xs text-slate-400">{svc.status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ServiceCard({ title, health }: { title: string; health: ServiceHealth | null }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="text-lg font-semibold text-slate-50">{health?.status ?? 'unknown'}</p>
    </div>
  )
}

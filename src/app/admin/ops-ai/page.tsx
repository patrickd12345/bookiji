'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { RiskBadge } from './_components/risk-badge'
import { AgentCard } from './_components/agent-card'
import { getFusedOpsState } from './lib/ops-summary'
import { opsGet } from './lib/ops-fetch'
import type {
  AnomalyReport,
  DeployReadiness,
  HealthStatus,
  Incident,
  MetricSnapshot,
  OpsAction,
  SLOStatus
} from './lib/ops-types'

type OverviewState = {
  fused: Awaited<ReturnType<typeof getFusedOpsState>> | null
  metrics?: {
    system?: MetricSnapshot
    bookings?: MetricSnapshot
    errors?: MetricSnapshot
    p95?: MetricSnapshot
  }
  slo?: SLOStatus[]
  incidents?: Incident[]
  actions?: OpsAction[]
  anomaly?: AnomalyReport
  readiness?: DeployReadiness
  health?: HealthStatus
}

export default function OpsAIOverviewPage() {
  const [state, setState] = useState<OverviewState>({ fused: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [fused, system, bookings, errors, p95] = await Promise.all([
          getFusedOpsState(),
          opsGet<MetricSnapshot>('/ops/metrics/system'),
          opsGet<MetricSnapshot>('/ops/metrics/bookings'),
          opsGet<MetricSnapshot>('/ops/metrics/errors'),
          opsGet<MetricSnapshot>('/ops/metrics/p95')
        ])

        if (!mounted) return
        setState({
          fused,
          metrics: { system, bookings, errors, p95 },
          slo: fused.slo,
          incidents: fused.incidents,
          actions: fused.actions,
          anomaly: fused.anomaly,
          readiness: fused.deployReadiness,
          health: fused.health
        })
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const metricsRow = useMemo(() => {
    const incidents = state.incidents?.length ?? 0
    const actions = state.actions?.filter((a) => a.status === 'pending').length ?? 0
    const health = state.health?.overall ?? 'unknown'
    const anomaly = state.anomaly?.status ?? 'none'
    return [
      { label: 'Active incidents', value: incidents.toString() },
      { label: 'Pending ops actions', value: actions.toString() },
      { label: 'Overall health', value: health },
      { label: 'Anomaly level', value: anomaly }
    ]
  }, [state])

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading OpsAI snapshot…</span>
      </div>
    )
  }

  if (error || !state.fused) {
    return (
      <div className="flex items-center gap-2 text-red-300 bg-red-900/30 border border-red-800 rounded-md p-3">
        <AlertTriangle className="h-5 w-5" />
        <span>{error || 'Failed to load OpsAI state'}</span>
      </div>
    )
  }

  const { fused } = state

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <RiskBadge risk={fused.risk} />
        <span className="text-sm text-slate-400">
          Snapshot: {new Date(fused.timestamp).toLocaleString()}
        </span>
        <span className="text-sm text-slate-300">
          {fused.risk === 'GREEN'
            ? 'All good'
            : fused.risk === 'YELLOW'
            ? 'Some issues'
            : 'Attention required'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <span>Scenario: {fused.scenario ?? 'n/a'}</span>
        <span>runId: {fused.runId ?? 'n/a'}</span>
        <span>seed: {fused.seed ?? 'n/a'}</span>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">OpsAI Commander View</h2>
            <p className="text-sm text-slate-400">{fused.summary}</p>
          </div>
          <span className="text-xs text-slate-500">Matches OpsAI Commander view</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Correlations</p>
            <ul className="text-sm text-slate-200 space-y-1">
              {(fused.correlations || []).slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Recommended checks</p>
            <ul className="text-sm text-slate-200 space-y-1">
              {(fused.recommendedChecks || []).slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {metricsRow.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1"
          >
            <p className="text-xs text-slate-400">{m.label}</p>
            <p className="text-xl font-semibold text-slate-50">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <AgentCard
          agentName="MetricsAI"
          label="System & Booking Metrics"
          status={`${state.metrics?.system?.value ?? '-'} ${state.metrics?.system?.unit ?? ''}`.trim()}
          summaryLines={[
            `Bookings: ${state.metrics?.bookings?.value ?? '-'}`,
            `Errors: ${state.metrics?.errors?.value ?? '-'}`,
            `P95: ${state.metrics?.p95?.value ?? '-'} ${state.metrics?.p95?.unit ?? ''}`
          ]}
          href="/admin/ops-ai/agents/metrics"
        />
        <AgentCard
          agentName="HealthAI"
          label="Subsystem Health"
          status={state.health?.overall ?? 'unknown'}
          summaryLines={(state.health?.services || []).slice(0, 3).map((s) => `${s.name}: ${s.status}`)}
          href="/admin/ops-ai/agents/health"
        />
        <AgentCard
          agentName="SLOAI"
          label="SLO Coverage"
          status={`${(state.slo || []).filter((s) => s.status === 'breach').length} breach`}
          summaryLines={(state.slo || []).slice(0, 3).map((s) => `${s.name}: ${s.status}`)}
          href="/admin/ops-ai/agents/slo"
        />
        <AgentCard
          agentName="IncidentsAI"
          label="Incident Triage"
          status={`${state.incidents?.length ?? 0} open`}
          summaryLines={(state.incidents || [])
            .slice(0, 3)
            .map((i) => `${i.title} • ${i.severity}/${i.status}`)}
          href="/admin/ops-ai/agents/incidents"
        />
        <AgentCard
          agentName="DeployAI"
          label="Deploy Readiness"
          status={state.readiness?.status ?? 'unknown'}
          summaryLines={(state.readiness?.reasons || []).slice(0, 2)}
          href="/admin/ops-ai/agents/deploy"
        />
        <AgentCard
          agentName="LogsAI"
          label="Log Signals"
          status="Latest log slices"
          summaryLines={[
            'Errors: /ops/logs/errors',
            'System: /ops/logs/system',
            'Booking: /ops/logs/booking'
          ]}
          href="/admin/ops-ai/agents/logs"
        />
        <AgentCard
          agentName="RegressionAI"
          label="Test/Regression Status"
          status="CI & E2E"
          summaryLines={['Tracks /ops/tests/ci/runs', '/ops/tests/e2e/runs']}
          href="/admin/ops-ai/agents/regression"
        />
        <AgentCard
          agentName="AnomalyAI"
          label="Anomaly Watch"
          status={state.anomaly?.status ?? 'none'}
          summaryLines={(state.anomaly?.findings || []).slice(0, 2).map((f) => `${f.source}: ${f.message}`)}
          href="/admin/ops-ai/agents/anomaly"
        />
      </div>
    </div>
  )
}

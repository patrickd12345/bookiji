import type { Incident } from '@/types/incidents'
import { loadIncidents } from '@/scripts/incidents-store'
import type { DeploymentRecord, TimeMachineDiff, TimeMachineState } from './types'
import { createOpsClient } from './ops-client'

type OpsDataSource = {
  summary: () => Promise<any>
  metrics: (kind: 'bookings' | 'system') => Promise<any>
  deployments: () => Promise<DeploymentRecord[]>
  incidents: () => Promise<any>
}

function defaultDataSource(baseUrl?: string): OpsDataSource {
  const opsai = createOpsClient(baseUrl)
  return {
    summary: () => opsai.summary(),
    metrics: (kind) => opsai.metrics(kind),
    deployments: () => opsai.deployments(),
    incidents: () => opsai.incidents()
  }
}

function filterByTimestamp<T extends { startedAt?: string; completedAt?: string | null }>(
  items: T[],
  at: string
): T[] {
  const ts = new Date(at).getTime()
  if (Number.isNaN(ts)) return items
  return items.filter((item) => {
    const started = item.startedAt ? new Date(item.startedAt).getTime() : null
    if (started && started > ts) return false
    return true
  })
}

function normalizeIncidents(payload: any): Incident[] {
  if (Array.isArray(payload)) return payload as Incident[]
  if (payload?.incidents && Array.isArray(payload.incidents)) {
    return payload.incidents as Incident[]
  }
  return []
}

function uniqueById<T extends { id?: string }>(items: T[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const id = item.id || JSON.stringify(item)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function extractMetricValue(metrics: any): number | undefined {
  if (!metrics) return undefined
  if (typeof metrics?.current === 'number') return metrics.current
  if (typeof metrics?.value === 'number') return metrics.value
  const series = metrics?.series || metrics?.raw_metrics || metrics?.data
  if (Array.isArray(series)) {
    const last = series[series.length - 1]
    if (typeof last === 'number') return last
    if (typeof last?.value === 'number') return last.value
  }
  return undefined
}

export async function getTimeMachineState(
  at: string,
  baseUrl?: string,
  source: OpsDataSource = defaultDataSource(baseUrl)
): Promise<TimeMachineState> {
  const [summary, bookingsMetrics, systemMetrics, deploymentsRaw, incidentsRaw] =
    await Promise.all([
      source.summary(),
      source.metrics('bookings').catch(() => ({})),
      source.metrics('system').catch(() => ({})),
      source.deployments().catch(() => []),
      source.incidents().catch(() => [])
    ])

  const deployments = Array.isArray(deploymentsRaw)
    ? deploymentsRaw
    : Array.isArray((deploymentsRaw as any)?.deployments)
    ? ((deploymentsRaw as any).deployments as DeploymentRecord[])
    : []

  const storedIncidents = loadIncidents()
  const incidents = uniqueById([
    ...normalizeIncidents(incidentsRaw),
    ...storedIncidents
  ]).filter((incident) => {
    const created = new Date(incident.createdAt).getTime()
    return !Number.isNaN(created) && created <= new Date(at).getTime()
  })

  return {
    at,
    health: summary?.health || { overall: 'unknown', services: [] },
    deployments: filterByTimestamp(deployments, at),
    incidents,
    metrics: {
      bookings: bookingsMetrics,
      system: systemMetrics
    },
    notes: [
      `Snapshot generated at ${new Date().toISOString()}`,
      deployments.length === 0 ? 'No deployments have been recorded yet.' : ''
    ].filter(Boolean)
  }
}

export async function getTimeMachineDiff(
  from: string,
  to: string,
  baseUrl?: string,
  source?: OpsDataSource
): Promise<TimeMachineDiff> {
  const dataSource = source || defaultDataSource(baseUrl)
  const [fromState, toState] = await Promise.all([
    getTimeMachineState(from, baseUrl, dataSource),
    getTimeMachineState(to, baseUrl, dataSource)
  ])

  const fromHealth = fromState.health?.overall || 'unknown'
  const toHealth = toState.health?.overall || 'unknown'
  const healthChanged = fromHealth !== toHealth

  const metricsDelta: Record<string, { from?: number; to?: number }> = {
    bookings: {
      from: extractMetricValue(fromState.metrics.bookings),
      to: extractMetricValue(toState.metrics.bookings)
    }
  }

  const diff: TimeMachineDiff = {
    from,
    to,
    changes: {
      healthChanged,
      healthFrom: fromHealth,
      healthTo: toHealth,
      deploymentsDelta: (toState.deployments?.length || 0) - (fromState.deployments?.length || 0),
      incidentsDelta: (toState.incidents?.length || 0) - (fromState.incidents?.length || 0),
      metricsDelta
    },
    summary: [
      healthChanged
        ? `Health changed ${fromHealth} -> ${toHealth}`
        : `Health unchanged (${toHealth})`,
      `Deployments delta: ${((toState.deployments?.length || 0) - (fromState.deployments?.length || 0)).toString()}`,
      `Incidents delta: ${((toState.incidents?.length || 0) - (fromState.incidents?.length || 0)).toString()}`
    ].join(' | ')
  }

  return diff
}

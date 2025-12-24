import type {
  SimState,
  SimRunInfo,
  SimMetrics,
  SimEventPayload,
  InvariantViolation
} from '@/lib/simcity/types'
import { DEFAULT_METRICS } from '@/lib/simcity/types'

import type {
  OpsSummary,
  MetricSnapshot,
  HealthStatus,
  SLOStatus,
  Incident,
  AnomalyReport,
  Deployment,
  DeployReadiness,
  LogsQueryResult,
  LogEntry
} from '@/app/admin/ops-ai/lib/ops-types'

function mapSeverityToLevel(severity: InvariantViolation['severity']) {
  return severity === 'critical' || severity === 'high' ? 'ERROR' : 'WARN'
}

function getLatencyMs(metrics: SimMetrics) {
  const raw =
    metrics.p95ResponseTime ??
    metrics.avgBookingLatency ??
    metrics.reindexP95 ??
    metrics.rolloutP99

  if (raw != null) {
    return Math.max(0, raw)
  }

  // Stable synthetic latency between 200-500ms
  return 350
}

export async function fetchSimcitySnapshot(origin?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL is required for SimCity mode')
  }

  const [statusRes, summaryRes] = await Promise.all([
    fetch(`${baseUrl}/api/simcity/status`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/simcity/summary`, { cache: 'no-store' })
  ])

  // Check if SimCity is not running
  if (!statusRes.ok || !summaryRes.ok) {
    const statusText = await statusRes.text().catch(() => '')
    const summaryText = await summaryRes.text().catch(() => '')
    if (statusText.includes('not running') || summaryText.includes('not running')) {
      throw new Error('SimCity simulation is not running')
    }
    throw new Error(`SimCity endpoints returned errors: ${statusRes.status}, ${summaryRes.status}`)
  }

  const statusJson = await statusRes.json()
  const summaryJson = await summaryRes.json()

  // Check if simulation is not running from response
  if (!statusJson.success || !statusJson.data?.state?.running) {
    throw new Error('SimCity simulation is not running')
  }

  const status = statusJson.data ?? statusJson
  const summary = summaryJson.data ?? summaryJson

  const state: SimState =
    (status?.state as SimState) ??
    (summary?.state as SimState) ??
    (summary as SimState)

  const runInfo: SimRunInfo | null =
    (status?.runInfo as SimRunInfo | null) ??
    (summary?.runInfo as SimRunInfo | null) ??
    (state?.runInfo as SimRunInfo | null) ??
    null

  const metrics: SimMetrics = {
    ...DEFAULT_METRICS,
    ...(status?.metrics as SimMetrics | undefined),
    ...(summary?.metrics as SimMetrics | undefined),
    ...(state?.metrics as SimMetrics | undefined)
  }

  const violations: InvariantViolation[] = summary?.violations ?? []

  return { state, runInfo, metrics, violations, summary, status }
}

export function simcityToOpsSummary(
  state: SimState,
  runInfo: SimRunInfo | null,
  violations: InvariantViolation[]
): OpsSummary {
  const metrics = state?.metrics

  const summary: OpsSummary & {
    runInfo?: SimRunInfo | null
    scenario?: string | null
  } = {
    timestamp: new Date().toISOString(),
    health: simcityToHealth(metrics, violations),
    sloSummary: simcityToSLOs(metrics, violations),
    incidents: simcityToIncidents(violations),
    pendingActions: [],
    runInfo,
    scenario: runInfo?.scenario ?? state?.scenario ?? null
  }

  return summary
}

export function simcityToSystemMetrics(metrics: SimMetrics): MetricSnapshot {
  const value =
    metrics.throughput ??
    metrics.activeAgents ??
    metrics.totalAgentsSpawned ??
    0

  return {
    timestamp: new Date().toISOString(),
    value,
    unit: 'agents'
  }
}

export function simcityToBookingMetrics(metrics: SimMetrics): MetricSnapshot {
  return {
    timestamp: new Date().toISOString(),
    value: metrics.completedBookings ?? 0,
    unit: 'bookings'
  }
}

export function simcityToErrorMetrics(metrics: SimMetrics): MetricSnapshot {
  return {
    timestamp: new Date().toISOString(),
    value: metrics.errors ?? metrics.errorCount ?? 0,
    unit: 'errors'
  }
}

export function simcityToLatencyMetrics(metrics: SimMetrics): MetricSnapshot {
  const latency = getLatencyMs(metrics)

  return {
    timestamp: new Date().toISOString(),
    value: latency,
    unit: 'ms'
  }
}

export function simcityToHealth(
  _metrics: SimMetrics,
  violations: InvariantViolation[]
): HealthStatus {
  const hasCritical = violations.some((v) => v.severity === 'critical')
  const hasHigh = violations.some((v) => v.severity === 'high')

  const overall = hasCritical ? 'down' : hasHigh ? 'degraded' : 'ok'

  return {
    overall,
    services: [
      { name: 'simcity-core', status: overall },
      { name: 'booking-sim', status: overall },
      { name: 'vendor-sim', status: overall }
    ]
  }
}

export function simcityToSLOs(
  metrics: SimMetrics,
  __violations: InvariantViolation[]
): SLOStatus[] {
  const completed = metrics.completedBookings ?? 0
  const cancelled = metrics.cancelledBookings ?? 0
  const errors = metrics.errors ?? metrics.errorCount ?? 0
  const total = completed + cancelled || 0

  const successRate = total > 0 ? (completed / total) * 100 : 0
  const errorRate = total > 0 ? (errors / total) * 100 : 0

  const bookingStatus: SLOStatus = {
    name: 'Booking success rate',
    status: successRate > 98 ? 'ok' : successRate > 90 ? 'warning' : 'breach',
    currentValue: Math.round(successRate * 100) / 100,
    target: '99%'
  }

  const errorStatus: SLOStatus = {
    name: 'Error rate',
    status: errorRate <= 0.5 ? 'ok' : errorRate <= 2 ? 'warning' : 'breach',
    currentValue: Math.round(errorRate * 100) / 100,
    target: '0.5%'
  }

  return [bookingStatus, errorStatus]
}

export function simcityToIncidents(
  violations: InvariantViolation[]
): Incident[] {
  return violations.map((violation, idx) => ({
    id: `${violation.code}-${violation.timestamp}-${idx}`,
    title: violation.message || violation.code,
    severity: violation.severity,
    status: 'open',
    summary: violation.details
      ? `${violation.message} (${JSON.stringify(violation.details)})`
      : violation.message
  }))
}

export function simcityToAnomaly(
  violations: InvariantViolation[]
): AnomalyReport {
  const hasCritical = violations.some((v) => v.severity === 'critical')
  const hasHigh = violations.some((v) => v.severity === 'high')
  const hasMedium = violations.some((v) => v.severity === 'medium')

  const status = hasCritical
    ? 'severe'
    : hasHigh
    ? 'moderate'
    : hasMedium
    ? 'minor'
    : 'none'

  return {
    status,
    findings: violations.map((v) => ({
      source: v.code,
      severity: v.severity,
      message: v.message
    }))
  }
}

export function simcityToDeployments(
  runInfo: SimRunInfo | null,
  violations: InvariantViolation[] = []
): Deployment[] {
  const criticalViolation = violations.some((v) => v.severity === 'critical')

  return [
    {
      id: runInfo?.runId ?? 'simcity-run',
      env: 'simcity',
      status: criticalViolation ? 'failed' : 'success'
    }
  ]
}

export function simcityToDeployReadiness(
  violations: InvariantViolation[]
): DeployReadiness {
  const hasCritical = violations.some((v) => v.severity === 'critical')
  const hasHigh = violations.some((v) => v.severity === 'high')

  if (hasCritical) {
    return { status: 'blocked', reasons: ['Critical invariant violations present'] }
  }

  if (hasHigh) {
    return { status: 'risky', reasons: ['High-severity invariant violations detected'] }
  }

  return { status: 'safe', reasons: [] }
}

export function simcityToLogs(
  violations: InvariantViolation[]
): LogsQueryResult {
  const entries: LogEntry[] = violations.map((v) => ({
    timestamp: v.timestamp,
    level: mapSeverityToLevel(v.severity),
    message: `[${v.code}] ${v.message}`
  }))

  return { entries }
}

export function simEventToOpsLog(
  e: SimEventPayload
): LogEntry | null {
  if (
    e.type !== 'error' &&
    e.type !== 'metric_spike' &&
    e.type !== 'invariant_violation'
  ) {
    return null
  }

  const level = e.type === 'error' ? 'ERROR' : 'WARN'
  const message =
    typeof e.data?.message === 'string'
      ? e.data.message
      : e.type === 'metric_spike'
      ? 'Metric spike detected'
      : e.type === 'invariant_violation'
      ? 'Invariant violation detected'
      : 'SimCity event'

  return {
    timestamp: e.timestamp,
    level,
    message
  }
}

import { opsGet } from './ops-fetch'
import type {
  AnomalyReport,
  DeployReadiness,
  HealthStatus,
  Incident,
  OpsAction,
  OpsSummary,
  SLOStatus
} from './ops-types'

export type FusedRisk = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED'

export type FusedOpsState = {
  timestamp: string
  health: HealthStatus
  slo: SLOStatus[]
  incidents: Incident[]
  actions: OpsAction[]
  anomaly: AnomalyReport
  deployReadiness: DeployReadiness
  risk: FusedRisk
  summary: string
  correlations: string[]
  recommendedChecks: string[]
}

function computeRisk(input: {
  incidents: Incident[]
  anomaly: AnomalyReport
  health: HealthStatus
  deployReadiness: DeployReadiness
}): FusedRisk {
  const hasCriticalIncident = input.incidents.some((i) => i.severity === 'critical')
  const hasHighIncident = input.incidents.some((i) => i.severity === 'high')

  if (
    hasCriticalIncident ||
    input.anomaly.status === 'severe' ||
    input.health.overall === 'down' ||
    input.deployReadiness.status === 'blocked'
  ) {
    return 'RED'
  }

  if (
    input.anomaly.status === 'moderate' ||
    input.health.overall === 'degraded' ||
    input.deployReadiness.status === 'risky'
  ) {
    return 'ORANGE'
  }

  if (hasHighIncident || input.anomaly.status === 'minor') {
    return 'YELLOW'
  }

  return 'GREEN'
}

function buildSummary(overall: string, incidentCount: number, anomaly: string, readiness: string) {
  return `System health: ${overall}. ${incidentCount} active incidents. Anomaly level: ${anomaly}. Deployment is ${readiness}.`
}

function buildCorrelations(state: {
  incidents: Incident[]
  anomaly: AnomalyReport
  health: HealthStatus
  deployReadiness: DeployReadiness
}): string[] {
  const messages: string[] = []

  if (state.anomaly.findings?.length && state.incidents.length) {
    messages.push('Anomalies align with active incidents; investigate common services.')
  }
  if (state.health.overall === 'degraded' && state.anomaly.status !== 'none') {
    messages.push('Health degradation coincides with anomaly signals.')
  }
  if (state.deployReadiness.status !== 'safe' && state.incidents.length) {
    messages.push('Deploy readiness impacted while incidents remain open.')
  }

  return messages
}

function buildRecommendedChecks(state: {
  incidents: Incident[]
  deployReadiness: DeployReadiness
  anomaly: AnomalyReport
}): string[] {
  const checks: string[] = []

  if (state.incidents.length > 0) {
    checks.push('Review active incidents and associated logs.')
  }
  if (state.deployReadiness.status !== 'safe') {
    checks.push('Hold non-critical deploys until readiness is safe.')
  }
  if (state.anomaly.status === 'moderate' || state.anomaly.status === 'severe') {
    checks.push('Inspect anomaly findings and correlate with recent changes.')
  }

  if (checks.length === 0) {
    checks.push('Maintain monitoring cadence; no immediate actions flagged.')
  }

  return checks
}

export async function getFusedOpsState(): Promise<FusedOpsState> {
  const [summary, anomaly, readiness] = await Promise.all([
    opsGet<OpsSummary>('/ops/summary'),
    opsGet<AnomalyReport>('/ops/anomaly'),
    opsGet<DeployReadiness>('/ops/deployments/readiness')
  ])

  const risk = computeRisk({
    incidents: summary.incidents,
    anomaly,
    health: summary.health,
    deployReadiness: readiness
  })

  return {
    timestamp: summary.timestamp,
    health: summary.health,
    slo: summary.sloSummary,
    incidents: summary.incidents,
    actions: summary.pendingActions,
    anomaly,
    deployReadiness: readiness,
    risk,
    summary: buildSummary(summary.health.overall, summary.incidents.length, anomaly.status, readiness.status),
    correlations: buildCorrelations({
      incidents: summary.incidents,
      anomaly,
      health: summary.health,
      deployReadiness: readiness
    }),
    recommendedChecks: buildRecommendedChecks({
      incidents: summary.incidents,
      deployReadiness: readiness,
      anomaly
    })
  }
}

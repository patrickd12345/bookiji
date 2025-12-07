// Types derived from the Bookiji Ops Fabric (read-only surface)

export type HealthOverall = 'ok' | 'degraded' | 'down' | 'unknown'
export type ServiceStatus = 'ok' | 'degraded' | 'down' | 'unknown'
export type SLOState = 'ok' | 'warning' | 'breach'
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'open' | 'monitoring' | 'resolved'
export type OpsActionStatus = 'pending' | 'approved' | 'rejected' | 'snoozed' | 'executed'
export type OpsActionSeverity = 'low' | 'medium' | 'high'
export type AnomalyStatus = 'none' | 'minor' | 'moderate' | 'severe'
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'
export type DeploymentStatus = 'success' | 'failed' | 'running' | 'rolled_back'
export type DeployReadinessStatus = 'safe' | 'risky' | 'blocked'

export interface MetricSnapshot {
  timestamp: string
  value: number
  unit: string
}

export interface MetricPoint {
  timestamp: string
  value: number
}

export interface TimeSeries {
  metric: string
  points: MetricPoint[]
}

export interface MetricsQueryResult {
  series: TimeSeries[]
}

export interface HealthStatus {
  overall: HealthOverall
  services: ServiceHealth[]
}

export interface ServiceHealth {
  name: string
  status: ServiceStatus
}

export interface SLOStatus {
  name: string
  status: SLOState
  currentValue: number
  target: string
}

export interface Incident {
  id: string
  title: string
  severity: IncidentSeverity
  status: IncidentStatus
  summary?: string
}

export interface OpsAction {
  id: string
  title: string
  status: OpsActionStatus
  severity: OpsActionSeverity
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
}

export interface LogsQueryResult {
  entries: LogEntry[]
}

export interface AnomalyFinding {
  source: string
  severity: AnomalySeverity
  message: string
}

export interface AnomalyReport {
  status: AnomalyStatus
  findings: AnomalyFinding[]
}

export interface Deployment {
  id: string
  env: string
  status: DeploymentStatus
}

export interface DeployReadiness {
  status: DeployReadinessStatus
  reasons: string[]
}

export interface CiRun {
  id: string
  status: string
}

export interface E2eRun {
  id: string
  status: string
}

export interface OpsSummary {
  timestamp: string
  health: HealthStatus
  sloSummary: SLOStatus[]
  incidents: Incident[]
  pendingActions: OpsAction[]
}

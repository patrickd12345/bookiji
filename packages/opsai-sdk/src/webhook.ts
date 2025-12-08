export type OpsAIWebhookEventType =
  | 'health.degraded'
  | 'bookings.anomaly'
  | 'deployments.new'
  | 'ops.test'

export interface OpsAIWebhookRegistration {
  url: string
  events?: OpsAIWebhookEventType[]
  createdAt: string
}

export interface OpsAIWebhookPayload<T = unknown> {
  id: string
  type: OpsAIWebhookEventType
  createdAt: string
  source: 'opsai'
  data: T
}

export type HealthDegradedPayload = {
  previous: string | null
  current: string
  impactedServices: string[]
}

export type BookingAnomalyPayload = {
  baseline: number
  current: number
  windowMinutes: number
  severity: 'low' | 'medium' | 'high'
}

export type DeploymentPayload = {
  id: string
  service: string
  version: string
  startedAt: string
  status: 'pending' | 'completed' | 'failed'
}

function uid() {
  return `wh_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export function buildWebhookPayload<T>(
  type: OpsAIWebhookEventType,
  data: T
): OpsAIWebhookPayload<T> {
  return {
    id: uid(),
    type,
    createdAt: new Date().toISOString(),
    source: 'opsai',
    data
  }
}

export function formatDeploymentFallback(): DeploymentPayload {
  return {
    id: 'none',
    service: 'ops-fabric',
    version: 'n/a',
    startedAt: new Date().toISOString(),
    status: 'pending'
  }
}

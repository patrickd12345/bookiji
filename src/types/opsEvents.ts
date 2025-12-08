export type EventType =
  | 'deployment'
  | 'health-check'
  | 'metric-threshold'
  | 'error'
  | 'alert'
  | 'user-action'
  | 'system-event'
  | 'webhook'
  | 'api-call'
  | 'health_change'
  | 'incident_created'
  | 'deployment_created'
  | 'prediction_update'
  | 'control_command'

export type EventSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface OpsEvent {
  id: string // uuid
  timestamp: string // ISO
  type: EventType
  severity: EventSeverity
  
  // Core event data
  title: string
  description?: string
  
  // Context
  source: string // e.g., 'watchdog', 'sentry', 'stripe', 'api'
  service?: string // e.g., '/api/quote', 'stripe-webhook'
  
  // Related entities
  relatedIncidentIds?: string[]
  relatedActionIds?: string[]
  
  // Event data
  data: Record<string, unknown> // flexible event payload
  
  // Metadata
  metadata?: Record<string, unknown>
  tags?: string[]
}







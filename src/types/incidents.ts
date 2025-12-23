export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'

export type IncidentStatus = 'open' | 'investigating' | 'mitigating' | 'resolved' | 'closed'

export type IncidentSource =
  | 'watchdog'
  | 'monitoring'
  | 'alert'
  | 'user-report'
  | 'automated-detection'
  | 'manual'

export interface IncidentSignal {
  type: string // e.g., 'latency_spike', 'error_rate', 'dlq_growth'
  value: number | string
  threshold?: number | string
  timestamp: string
  source: string // e.g., 'health-check', 'sentry', 'stripe-webhook'
  metadata?: Record<string, unknown>
}

export interface Incident {
  id: string // uuid
  createdAt: string // ISO
  updatedAt: string // ISO
  resolvedAt?: string // ISO
  closedAt?: string // ISO
  
  // Core incident data
  title: string // short human summary
  description: string // detailed explanation
  severity: IncidentSeverity
  status: IncidentStatus
  
  // Source and context
  source: IncidentSource
  signals: IncidentSignal[] // shared signals that triggered/contributed to this incident
  
  // Related data
  relatedIncidentIds?: string[] // links to related incidents
  relatedActionIds?: string[] // links to ops actions
  relatedEventIds?: string[] // links to events
  
  // Analysis and triage
  impact?: string // human-readable impact assessment
  affectedServices?: string[] // e.g., ['/api/quote', 'stripe-webhook']
  affectedUsers?: number // estimated user impact
  estimatedResolutionTime?: string // ISO duration
  
  // Resolution
  resolution?: string // how it was resolved
  resolvedBy?: string // who resolved it
  postMortemUrl?: string // link to post-mortem doc
  
  // Metadata
  metadata: Record<string, unknown> // extra data (deployment sha, metrics, etc.)
  tags?: string[] // for categorization
}



















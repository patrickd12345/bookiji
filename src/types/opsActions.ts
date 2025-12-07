export type ActionSource =
  | 'watchdog'
  | 'regression'
  | 'canary'
  | 'performance'
  | 'ciOptimizer'
  | 'manual'

export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'snoozed' | 'executed'

export interface OpsAction {
  id: string // uuid
  createdAt: string // ISO
  updatedAt: string // ISO
  source: ActionSource
  title: string // short human summary
  description: string // detailed explanation
  severity: 'low' | 'medium' | 'high'
  recommendedCommand: string // e.g. "rollback --to=abc123"
  metadata: Record<string, unknown> // extra data (sha, metrics, etc.)
  status: ActionStatus
  decidedBy?: string // "patrick" or "auto"
  decidedAt?: string // ISO
  snoozeUntil?: string | null // ISO or null
}

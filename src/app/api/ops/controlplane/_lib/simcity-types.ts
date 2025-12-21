export type SimCityEventType = 'domain.signal' | 'proposal.generated' | (string & {})

export type SimCityEvent = {
  id: string
  tick: number
  domain: string
  type: SimCityEventType
  payload: Record<string, unknown>
}

export type SimCityEventEnvelope = {
  version: 1
  seed: number
  generatedAtTick: number
  event: SimCityEvent
}

export type SimCityEventSpec = {
  domain: string
  type: SimCityEventType
  payload: Record<string, unknown>
}

export type SimCityProposal = {
  id: string
  tick: number
  domain: string
  action: string
  description: string
  confidence: number
  evidenceEventIds: string[]
  source: 'llm' | 'rules'
}

export type ProposalMode = 'llm' | 'rules' | 'hybrid' | 'off'

export type SimCityProposalConfig = {
  mode: ProposalMode
  maxPerTick?: number
  minConfidence?: number
}

// Phase 5: Replay types
export type SimCityProposalAction = {
  proposalId: string
  domain: string
  action: string
  parameters?: Record<string, unknown>
}

export type SimCityInterventionPlan = {
  atTick: number
  proposals?: SimCityProposal[]
  actions?: SimCityProposalAction[]
}

export type SimCityReplayRequest = {
  fromTick: number
  toTick: number
  baseline?: boolean
  variants?: Array<{
    name: string
    interventions: SimCityInterventionPlan[]
  }>
  filters?: {
    domains?: string[]
    eventTypes?: string[]
  }
}

export type SimCityReplayVariant = {
  name: string
  events: SimCityEventEnvelope[]
  metricsByTick: Record<number, Record<string, unknown>>
  summary: {
    totalEvents: number
    eventsByDomain: Record<string, number>
    eventsByType: Record<string, number>
  }
}

export type SimCityReplayResponse = {
  runId: string
  seed: number
  fromTick: number
  toTick: number
  baseline?: SimCityReplayVariant
  variants: SimCityReplayVariant[]
  generatedAt: string
}

export type SimCityReplayDiff = {
  domain: string
  eventType: string
  baselineCount: number
  variantCount: number
  delta: number
}

export type SimCityReplayMetricDelta = {
  metric: string
  baselineValue: number | null
  variantValue: number | null
  delta: number | null
}

export type SimCityReplayReport = {
  runId: string
  reportHash: string
  seed: number
  fromTick: number
  toTick: number
  baselineSummary: {
    totalEvents: number
    eventsByDomain: Record<string, number>
    eventsByType: Record<string, number>
    metrics: Record<string, unknown>
  }
  variantSummaries: Array<{
    name: string
    totalEvents: number
    eventsByDomain: Record<string, number>
    eventsByType: Record<string, number>
    metrics: Record<string, unknown>
  }>
  diffs: Array<{
    variantName: string
    eventDiffs: SimCityReplayDiff[]
    metricDeltas: SimCityReplayMetricDelta[]
  }>
  markdownSummary: string
  generatedAt: string
}

// Phase 6: Metrics, Dials, and Evaluation types
export type MetricId =
  | 'booking.success_rate'
  | 'booking.drop_rate'
  | 'capacity.utilization'
  | 'trust.violation_rate'
  | 'latency.p95'
  | 'error.rate'

export type MetricDirection = 'higher-is-better' | 'lower-is-better'

export type MetricDefinition = {
  id: MetricId
  domain: string
  description: string
  unit: string
  direction: MetricDirection
}

export type MetricValue = {
  id: MetricId
  value: number
}

export type MetricDelta = {
  id: MetricId
  base: number
  variant: number
  delta: number
  direction: 'improved' | 'degraded' | 'neutral'
}

export type DialDefinition = {
  metric: MetricId
  green: [number, number]
  yellow: [number, number]
  red: [number, number]
}

export type DialStatus = {
  metric: MetricId
  value: number
  zone: 'green' | 'yellow' | 'red'
}

export type EvaluationResult = {
  allowed: boolean
  violated: DialStatus[]
  warnings: DialStatus[]
  summary: string
  reportHash: string
  variantId?: string
}

// Phase 7: Governance & Promotion types
export type GovernanceVerdict = 'allow' | 'warn' | 'block'

export type GovernanceReason = {
  ruleId: string
  severity: 'info' | 'warn' | 'block'
  message: string
  evidence?: Record<string, unknown>
}

export type OverrideRequirement = {
  reason: string
  roleRequired: 'admin' | 'safety' | 'exec'
  expiresAfterTicks?: number
}

export type PromotionDecision = {
  proposalId: string
  domain: string
  action: string
  verdict: GovernanceVerdict
  reasons: GovernanceReason[]
  requiredOverrides?: OverrideRequirement[]
  evaluatedAtTick: number
  inputsHash: string
  decisionHash: string
}

export type GovernanceContext = {
  tick: number
  proposal: SimCityProposal
  dialsSnapshot?: DialStatus[]
  replayEvaluation?: {
    base?: EvaluationResult
    variant?: EvaluationResult
    deltas?: MetricDelta[]
  }
  replayReportSummary?: {
    reportHash: string
    markdownSummary?: string
    eventDiff?: Record<string, unknown>
  }
}

// Phase 9: Human Overrides
export type OverrideVerdict = 'ALLOW' | 'WARN' | 'BLOCK'

export interface OverrideActor {
  userId: string
  role: string
}

export interface OverrideRecord {
  overrideId: string
  proposalId: string
  decisionHash: string

  verdictBefore: OverrideVerdict
  verdictAfter: OverrideVerdict

  actor: OverrideActor
  justification: string

  timestamp: string // ISO, injected once
  overrideHash: string
}

// Phase 10: Production Shadow Mode
export interface ShadowEvent {
  source: 'production'
  timestamp: string
  domainEvent: unknown
}

export interface ShadowComparisonReport {
  window: string
  simcityMetrics: Record<string, number>
  prodMetrics: Record<string, number>
  deltas: Array<{
    metric: string
    simcityValue: number
    prodValue: number
    delta: number
  }>
  hypotheticalVerdict: GovernanceVerdict
  divergenceFlags: string[]
  reportHash: string
}

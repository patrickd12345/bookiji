/**
 * Jarvis - Incident Commander Types
 * 
 * The 3AM contract: Jarvis stands watch while you sleep.
 */

export type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3'
export type Environment = 'prod' | 'staging' | 'local'

/**
 * Incident Snapshot - The single source of truth for "what's happening right now"
 * 
 * This is the payload Jarvis reasons over. No LLM touches prod without this.
 */
export interface IncidentSnapshot {
  env: Environment
  timestamp: string

  severity_guess: Severity
  confidence: number // 0-1

  signals: {
    error_rate_spike: boolean
    invariant_violations: string[]
    stripe_webhook_backlog: boolean
    booking_failures: boolean
    deploy_recent: boolean
  }

  system_state: {
    scheduling_enabled: boolean
    kill_switch_active: boolean
    degraded_mode: boolean
  }

  blast_radius: string[]
  safe_components: string[]
  unsafe_components: string[]

  auto_actions_taken: string[]
}

/**
 * LLM Assessment - Jarvis' reasoning about the incident
 */
export interface JarvisAssessment {
  assessment: string // Plain English summary
  severity: Severity // Confirmed or downgraded
  recommended_actions: Array<{
    id: string // A, B, C, D, etc.
    label: string
    description: string
    risk_level: 'low' | 'medium' | 'high'
  }>
  what_happens_if_no_reply: string
  confidence: number // 0-1
}

/**
 * SMS Message - Formatted incident report for 3AM
 */
export interface IncidentSMS {
  severity: Severity
  environment: Environment
  what: string
  impact: string
  safe: string[]
  actions_taken: string[]
  recommendations: Array<{
    id: string
    label: string
  }>
  no_reply_action: string
}

/**
 * SMS Reply Parsing - User's response to incident
 */
export interface ParsedReply {
  choices: string[] // ['A', 'B', 'C']
  constraints: string[] // ['no further alerts unless severity increases']
  natural_language_instruction?: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Action Execution Result
 */
export interface ActionResult {
  action_id: string
  success: boolean
  message: string
  error?: string
}

/**
 * Pre-authorized action matrix
 * 
 * Jarvis can execute these without waking you.
 * Everything else waits for coffee.
 */
export interface AllowedAction {
  id: string
  name: string
  description: string
  allowed_in_prod: boolean
  allowed_in_staging: boolean
  execute: (env: Environment) => Promise<ActionResult>
}

/**
 * Incident State - Tracks ongoing incidents
 */
export interface IncidentState {
  incident_id: string
  snapshot: IncidentSnapshot
  assessment: JarvisAssessment
  sms_sent_at?: string
  last_reply_at?: string
  parsed_reply?: ParsedReply
  actions_executed: ActionResult[]
  resolved: boolean
  resolved_at?: string
}

/**
 * Parsed Intent - Result of SMS intent parsing
 */
export interface ParsedIntent {
  actions: string[] // Action IDs: ['DISABLE_SCHEDULING', 'ENABLE_SCHEDULING']
  context?: string // Free-text context from LLM
  confidence: 'high' | 'medium' | 'low'
}


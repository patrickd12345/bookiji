/**
 * Incident Snapshot Collector
 * 
 * Gathers all system state into a single snapshot.
 * This is the backbone - everything else hangs off it.
 */

import { getServerSupabase } from '@/lib/supabaseServer'
import { getAppEnv } from '@/lib/env/assertAppEnv'
import type { IncidentSnapshot, Severity } from './types'

/**
 * Collect incident snapshot from all system sources
 */
export async function getIncidentSnapshot(): Promise<IncidentSnapshot> {
  const env = getAppEnv() || 'local'
  const timestamp = new Date().toISOString()

  // Collect all signals in parallel
  const [
    systemFlags,
    healthStatus,
    invariantViolations,
    webhookStatus,
    bookingFailures,
    recentDeploy
  ] = await Promise.allSettled([
    getSystemFlags(),
    getHealthStatus(),
    getInvariantViolations(),
    getWebhookStatus(),
    getBookingFailures(),
    getRecentDeploy()
  ])

  // Extract system state
  const schedulingEnabled = systemFlags.status === 'fulfilled' 
    ? systemFlags.value.scheduling_enabled 
    : true // Fail open

  const killSwitchActive = !schedulingEnabled

  // Extract signals
  const errorRateSpike = healthStatus.status === 'fulfilled' 
    ? healthStatus.value.status === 'unhealthy' 
    : false

  const invariantViols = invariantViolations.status === 'fulfilled'
    ? invariantViolations.value
    : []

  const stripeBacklog = webhookStatus.status === 'fulfilled'
    ? webhookStatus.value.has_backlog
    : false

  const bookingFails = bookingFailures.status === 'fulfilled'
    ? bookingFailures.value.has_failures
    : false

  const deployRecent = recentDeploy.status === 'fulfilled'
    ? recentDeploy.value.recent
    : false

  // Determine blast radius
  const blastRadius: string[] = []
  const safeComponents: string[] = []
  const unsafeComponents: string[] = []

  if (errorRateSpike) {
    blastRadius.push('api')
    unsafeComponents.push('api')
  } else {
    safeComponents.push('api')
  }

  if (stripeBacklog) {
    blastRadius.push('payments')
    unsafeComponents.push('payments')
  } else {
    safeComponents.push('payments')
  }

  if (bookingFails) {
    blastRadius.push('bookings')
    unsafeComponents.push('bookings')
  } else {
    safeComponents.push('bookings')
  }

  if (invariantViols.length > 0) {
    blastRadius.push('data_integrity')
    unsafeComponents.push('data_integrity')
  } else {
    safeComponents.push('data_integrity')
  }

  // Heuristic severity guess
  const severityGuess = calculateSeverity({
    errorRateSpike,
    invariantViols: invariantViols.length,
    stripeBacklog,
    bookingFails,
    killSwitchActive,
    env
  })

  // Auto-actions already taken
  const autoActionsTaken: string[] = []
  if (killSwitchActive) {
    autoActionsTaken.push('scheduling_kill_switch_enabled')
  }

  return {
    env: env as 'prod' | 'staging' | 'local',
    timestamp,
    severity_guess: severityGuess,
    confidence: 0.7, // Base confidence, LLM will refine
    signals: {
      error_rate_spike: errorRateSpike,
      invariant_violations: invariantViols,
      stripe_webhook_backlog: stripeBacklog,
      booking_failures: bookingFails,
      deploy_recent: deployRecent
    },
    system_state: {
      scheduling_enabled: schedulingEnabled,
      kill_switch_active: killSwitchActive,
      degraded_mode: errorRateSpike || stripeBacklog
    },
    blast_radius: blastRadius,
    safe_components: safeComponents,
    unsafe_components: unsafeComponents,
    auto_actions_taken: autoActionsTaken
  }
}

/**
 * Get system flags (kill switches, etc.)
 */
async function getSystemFlags(): Promise<{
  scheduling_enabled: boolean
}> {
  try {
    const supabase = getServerSupabase()
    const { data, error } = await supabase
      .from('system_flags')
      .select('key, value')
      .eq('key', 'scheduling_enabled')
      .single()

    if (error || !data) {
      // Fail open - default to enabled
      return { scheduling_enabled: true }
    }

    return {
      scheduling_enabled: data.value === true
    }
  } catch {
    return { scheduling_enabled: true } // Fail open
  }
}

/**
 * Get health status from health endpoint
 */
async function getHealthStatus(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
}> {
  try {
    // Use internal health check logic instead of HTTP call
    const { getServerSupabase } = await import('@/lib/supabaseServer')
    const supabase = getServerSupabase()
    
    const startTime = Date.now()
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    const latency = Date.now() - startTime

    if (error) {
      return { status: 'unhealthy' }
    }

    if (latency > 1000) {
      return { status: 'degraded' }
    }

    return { status: 'healthy' }
  } catch {
    return { status: 'unhealthy' }
  }
}

/**
 * Get invariant violations (simplified - check recent violations)
 */
async function getInvariantViolations(): Promise<string[]> {
  // TODO: Integrate with SimCity or invariant checker
  // For now, return empty array
  return []
}

/**
 * Get webhook processing status
 */
async function getWebhookStatus(): Promise<{
  has_backlog: boolean
}> {
  try {
    const { dlqMonitor } = await import('@/lib/observability/dlqMonitor')
    const status = await dlqMonitor.getStatus()
    
    return {
      has_backlog: status.size >= 20 // DLQ threshold
    }
  } catch {
    return { has_backlog: false }
  }
}

/**
 * Check for recent booking failures
 */
async function getBookingFailures(): Promise<{
  has_failures: boolean
}> {
  try {
    const supabase = getServerSupabase()
    
    // Check for recent booking errors (last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('status', 'failed')
      .gte('created_at', fifteenMinutesAgo)
      .limit(1)

    if (error) {
      return { has_failures: false } // Can't determine, assume no failures
    }

    return {
      has_failures: (data?.length || 0) > 0
    }
  } catch {
    return { has_failures: false }
  }
}

/**
 * Check if there was a recent deploy
 */
async function getRecentDeploy(): Promise<{
  recent: boolean
  deploy_time?: string
}> {
  // Check for recent deploy marker or version change
  // For now, simplified check
  const deployTime = process.env.DEPLOY_TIME
  if (deployTime) {
    const deployDate = new Date(deployTime)
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000
    return {
      recent: deployDate.getTime() > fifteenMinutesAgo,
      deploy_time: deployTime
    }
  }
  
  return { recent: false }
}

/**
 * Calculate severity heuristic
 */
function calculateSeverity(input: {
  errorRateSpike: boolean
  invariantViols: number
  stripeBacklog: boolean
  bookingFails: boolean
  killSwitchActive: boolean
  env: string | undefined
}): Severity {
  const { errorRateSpike, invariantViols, stripeBacklog, bookingFails, killSwitchActive, env } = input

  // SEV-1: Critical issues in prod
  if (env === 'prod') {
    if (invariantViols > 0) return 'SEV-1'
    if (errorRateSpike && bookingFails) return 'SEV-1'
    if (stripeBacklog && bookingFails) return 'SEV-1'
  }

  // SEV-1: Kill switch active (something is very wrong)
  if (killSwitchActive && (errorRateSpike || bookingFails)) {
    return 'SEV-1'
  }

  // SEV-2: Degraded but not critical
  if (errorRateSpike || stripeBacklog || bookingFails) {
    return 'SEV-2'
  }

  // SEV-3: Everything else
  return 'SEV-3'
}


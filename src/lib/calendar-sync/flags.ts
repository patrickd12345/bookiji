/**
 * Calendar Sync Feature Flags
 * 
 * Authoritative module for calendar sync feature flags and allowlists.
 * All flags default to false and require explicit opt-in via environment variables.
 * In production, both flag AND allowlist membership are required.
 */

function readFlag(name: string, opts?: { defaultInTest?: boolean }): boolean {
  const raw = process.env[name]
  if (raw === 'true') return true
  if (raw === 'false') return false
  return process.env.NODE_ENV === 'test' ? Boolean(opts?.defaultInTest) : false
}

// Parse allowlists from comma-separated env vars
const parseAllowlist = (envVar?: string): Set<string> => {
  if (!envVar) return new Set()
  return new Set(
    envVar
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  )
}

function getAllowlistProviderIds() {
  return parseAllowlist(process.env.CALENDAR_ALLOWLIST_PROVIDER_IDS)
}

function getAllowlistConnectionIds() {
  return parseAllowlist(process.env.CALENDAR_ALLOWLIST_CONNECTION_IDS)
}

const isProduction = () => process.env.NODE_ENV === 'production'

/**
 * Check if calendar sync is enabled
 * In production, requires both flag AND allowlist (if allowlist exists)
 */
export function isCalendarSyncEnabled(provider_id?: string, connection_id?: string): boolean {
  const CALENDAR_SYNC_ENABLED = readFlag('CALENDAR_SYNC_ENABLED', { defaultInTest: true })
  const ALLOWLIST_PROVIDER_IDS = getAllowlistProviderIds()
  const ALLOWLIST_CONNECTION_IDS = getAllowlistConnectionIds()

  if (!CALENDAR_SYNC_ENABLED) return false

  if (isProduction()) {
    // In production, require allowlist membership if allowlist exists
    if (ALLOWLIST_PROVIDER_IDS.size > 0 || ALLOWLIST_CONNECTION_IDS.size > 0) {
      if (provider_id && !ALLOWLIST_PROVIDER_IDS.has(provider_id)) return false
      if (connection_id && !ALLOWLIST_CONNECTION_IDS.has(connection_id)) return false
      // If allowlist exists but neither ID is provided, deny
      if (!provider_id && !connection_id) return false
    }
  }

  return true
}

/**
 * Check if OAuth is enabled
 * In production, requires both flag AND allowlist (if allowlist exists)
 */
export function isOAuthEnabled(provider_id?: string): boolean {
  const CALENDAR_OAUTH_ENABLED = readFlag('CALENDAR_OAUTH_ENABLED', { defaultInTest: true })
  const ALLOWLIST_PROVIDER_IDS = getAllowlistProviderIds()

  if (!CALENDAR_OAUTH_ENABLED) return false

  if (isProduction()) {
    // In production, require allowlist membership if allowlist exists
    if (ALLOWLIST_PROVIDER_IDS.size > 0) {
      if (!provider_id || !ALLOWLIST_PROVIDER_IDS.has(provider_id)) return false
    }
  }

  return true
}

/**
 * Check if jobs are enabled
 * In production, requires both flag AND allowlist (if allowlist exists)
 */
export function isJobsEnabled(provider_id?: string, connection_id?: string): boolean {
  const CALENDAR_JOBS_ENABLED = readFlag('CALENDAR_JOBS_ENABLED', { defaultInTest: true })
  const ALLOWLIST_PROVIDER_IDS = getAllowlistProviderIds()
  const ALLOWLIST_CONNECTION_IDS = getAllowlistConnectionIds()

  if (!CALENDAR_JOBS_ENABLED) return false

  if (isProduction()) {
    // In production, require allowlist membership if allowlist exists
    if (ALLOWLIST_PROVIDER_IDS.size > 0 || ALLOWLIST_CONNECTION_IDS.size > 0) {
      if (provider_id && !ALLOWLIST_PROVIDER_IDS.has(provider_id)) return false
      if (connection_id && !ALLOWLIST_CONNECTION_IDS.has(connection_id)) return false
      // If allowlist exists but neither ID is provided, deny
      if (!provider_id && !connection_id) return false
    }
  }

  return true
}

/**
 * Check if webhooks are enabled
 * In production, requires both flag AND allowlist (if allowlist exists)
 */
export function isWebhookEnabled(connection_id?: string): boolean {
  const CALENDAR_WEBHOOK_ENABLED = readFlag('CALENDAR_WEBHOOK_ENABLED', { defaultInTest: true })
  const ALLOWLIST_CONNECTION_IDS = getAllowlistConnectionIds()

  if (!CALENDAR_WEBHOOK_ENABLED) return false

  if (isProduction()) {
    // In production, require allowlist membership if allowlist exists
    if (ALLOWLIST_CONNECTION_IDS.size > 0) {
      if (!connection_id || !ALLOWLIST_CONNECTION_IDS.has(connection_id)) return false
    }
  }

  return true
}

/**
 * Check if a provider is allowlisted
 */
export function isProviderAllowed(provider_id: string): boolean {
  const ALLOWLIST_PROVIDER_IDS = getAllowlistProviderIds()
  if (ALLOWLIST_PROVIDER_IDS.size === 0) {
    // No allowlist means all providers allowed (when flag is enabled)
    return true
  }
  return ALLOWLIST_PROVIDER_IDS.has(provider_id)
}

/**
 * Check if a connection is allowlisted
 */
export function isConnectionAllowed(connection_id: string): boolean {
  const ALLOWLIST_CONNECTION_IDS = getAllowlistConnectionIds()
  if (ALLOWLIST_CONNECTION_IDS.size === 0) {
    // No allowlist means all connections allowed (when flag is enabled)
    return true
  }
  return ALLOWLIST_CONNECTION_IDS.has(connection_id)
}

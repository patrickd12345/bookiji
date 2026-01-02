/**
 * STUB: Build-time placeholder for Slack notification module
 * 
 * Real Slack integration is an ops concern and should be implemented
 * here when the integration is ready.
 * 
 * Activation requires explicit environment configuration.
 */

// Interface matching usage in notifyWithEscalation.ts
export interface PostIncidentNotificationParams {
  incidentId: string
  severity: string
  env: string
  summary: string
  details: string
}

export interface PostSeverityChangeUpdateParams {
  incidentId: string
  severity: string
  env: string
  summary: string
  details: string
  threadTs: string
}

/**
 * Stub for posting incident notification to Slack
 */
export async function postIncidentNotification(
  params: PostIncidentNotificationParams
): Promise<string | null> {
  console.warn('[Jarvis Stub] Slack notifier is stubbed. Notification suppressed:', params.incidentId)
  return null
}

/**
 * Stub for posting severity update to Slack
 */
export async function postSeverityChangeUpdate(
  params: PostSeverityChangeUpdateParams
): Promise<void> {
  console.warn('[Jarvis Stub] Slack severity update is stubbed. Update suppressed:', params.incidentId)
}

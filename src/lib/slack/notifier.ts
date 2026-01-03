import { logger, LogContext } from '@/lib/logger'

interface IncidentNotificationParams {
  incidentId: string
  severity: string
  env: string
  summary: string
  details: string
}

interface SeverityUpdateParams extends IncidentNotificationParams {
  threadTs: string
}

export async function postIncidentNotification(params: IncidentNotificationParams): Promise<string | null> {
  logger.info('[Stub] postIncidentNotification called', params as unknown as LogContext)
  return null
}

export async function postSeverityChangeUpdate(params: SeverityUpdateParams): Promise<void> {
  logger.info('[Stub] postSeverityChangeUpdate called', params as unknown as LogContext)
}

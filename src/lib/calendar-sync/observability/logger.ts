/**
 * Structured Logging for Calendar Sync
 * 
 * Provides structured logging with automatic token redaction
 */

import { redactTokens } from '../utils/token-redaction'
import type { JobRunSummary } from '../jobs/run-sync-job'

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  category: 'calendar_sync'
  sync_id?: string
  provider_id?: string
  connection_id?: string
  calendar_provider?: string
  cursor?: string
  duration_ms?: number
  error_code?: string
  message: string
  metadata?: Record<string, unknown>
}

/**
 * Log a job run summary
 */
export function logJobRun(
  summary: JobRunSummary,
  metadata?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: summary.errors.length > 0 ? 'warn' : 'info',
    category: 'calendar_sync',
    duration_ms: summary.duration_ms,
    message: `Calendar sync job completed: ${summary.connections_succeeded}/${summary.connections_processed} succeeded`,
    metadata: {
      ...metadata,
      connections_processed: summary.connections_processed,
      connections_succeeded: summary.connections_succeeded,
      connections_failed: summary.connections_failed,
      items_ingested: summary.items_ingested,
      items_updated: summary.items_updated,
      outbound_retried: summary.outbound_retried,
      outbound_succeeded: summary.outbound_succeeded,
      error_count: summary.errors.length,
    },
  }

  const redacted = redactTokens(entry)
  if (entry.level === 'warn') {
    console.warn(JSON.stringify(redacted))
  } else {
    console.log(JSON.stringify(redacted))
  }
}

/**
 * Log a sync error
 */
export function logSyncError(
  connection_id: string,
  error: Error,
  context?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    category: 'calendar_sync',
    connection_id,
    error_code: error.name,
    message: `Calendar sync error: ${error.message}`,
    metadata: {
      ...context,
      error_message: error.message,
      error_stack: error.stack,
    },
  }

  const redacted = redactTokens(entry)
  console.error(JSON.stringify(redacted))
}

/**
 * Log a sync operation
 */
export function logSyncOperation(
  message: string,
  context?: {
    provider_id?: string
    connection_id?: string
    calendar_provider?: string
    sync_id?: string
    cursor?: string
    duration_ms?: number
    metadata?: Record<string, unknown>
  }
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    category: 'calendar_sync',
    message,
    ...context,
  }

  const redacted = redactTokens(entry)
  console.log(JSON.stringify(redacted))
}

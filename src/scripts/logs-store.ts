/**
 * LogsAI - Log store utility
 * 
 * Manages log entries and pattern detection
 */

import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { LogEntry, LogPattern, LogCategory, LogSeverity } from '../types/logs'
import { loadEvents } from './ops-events-store'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { loadIncidents } from './incidents-store'
import type { OpsEvent } from '../types/opsEvents'

const IS_SERVERLESS = process.env.VERCEL === '1'
const LOGS_FILE = path.join(process.cwd(), 'ops-state', 'logs.json')
const PATTERNS_FILE = path.join(process.cwd(), 'ops-state', 'log-patterns.json')

// In-memory stores for serverless environments
let memoryLogs: LogEntry[] = []
let memoryPatterns: LogPattern[] = []

function ensureFile(filePath: string) {
  if (IS_SERVERLESS) return
  try {
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
    }
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]', 'utf8')
    }
  } catch (error) {
    console.warn('logs-store: unable to ensure storage file', error)
  }
}

// Log entries storage
export function loadLogs(): LogEntry[] {
  if (IS_SERVERLESS) {
    return memoryLogs
  }
  ensureFile(LOGS_FILE)
  try {
    const raw = fs.readFileSync(LOGS_FILE, 'utf8')
    return JSON.parse(raw) as LogEntry[]
  } catch {
    return []
  }
}

export function saveLogs(logs: LogEntry[]) {
  if (IS_SERVERLESS) {
    memoryLogs = logs
    console.warn('Ops store in read-only mode: persistence unavailable.')
    return
  }
  ensureFile(LOGS_FILE)
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8')
  } catch (error) {
    throw new Error(
      `logs-store: failed to persist logs (is ops-state writable?): ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export function createLogEntry(
  partial: Omit<LogEntry, 'id' | 'timestamp'>
): LogEntry {
  const now = new Date().toISOString()
  const log: LogEntry = {
    id: randomUUID(),
    timestamp: now,
    ...partial
  }
  const all = loadLogs()
  all.push(log)
  saveLogs(all)
  return log
}

// Pattern storage
export function loadPatterns(): LogPattern[] {
  if (IS_SERVERLESS) {
    return memoryPatterns
  }
  ensureFile(PATTERNS_FILE)
  try {
    const raw = fs.readFileSync(PATTERNS_FILE, 'utf8')
    return JSON.parse(raw) as LogPattern[]
  } catch {
    return []
  }
}

export function savePatterns(patterns: LogPattern[]) {
  if (IS_SERVERLESS) {
    memoryPatterns = patterns
    console.warn('Ops store in read-only mode: persistence unavailable.')
    return
  }
  ensureFile(PATTERNS_FILE)
  try {
    fs.writeFileSync(PATTERNS_FILE, JSON.stringify(patterns, null, 2), 'utf8')
  } catch (error) {
    throw new Error(
      `logs-store: failed to persist log patterns (is ops-state writable?): ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

// Get logs by category
export function getLogsByCategory(category: LogCategory): LogEntry[] {
  const all = loadLogs()
  return all.filter((log) => log.category === category)
}

// Get logs by time range
export function getLogsByTimeRange(
  startTime: string,
  endTime?: string
): LogEntry[] {
  const all = loadLogs()
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()
  
  return all.filter((log) => {
    const logTime = new Date(log.timestamp).getTime()
    return logTime >= start && logTime <= end
  })
}

// Get logs by severity
export function getLogsBySeverity(severity: LogSeverity): LogEntry[] {
  const all = loadLogs()
  return all.filter((log) => log.severity === severity)
}

// Get logs by service
export function getLogsByService(service: string): LogEntry[] {
  const all = loadLogs()
  return all.filter((log) => log.service === service)
}

// Convert OpsEvents to LogEntries for analysis
export function convertEventsToLogs(events: OpsEvent[]): LogEntry[] {
  return events.map((event) => ({
    id: event.id,
    timestamp: event.timestamp,
    category: event.type === 'error' ? 'error' : 
              event.type === 'deployment' ? 'system' : 
              event.type === 'webhook' ? 'booking' : 'event',
    severity: event.severity,
    message: event.title,
    source: event.source,
    service: event.service,
    metadata: event.data,
    tags: event.tags,
    relatedEventIds: [event.id],
    relatedIncidentIds: event.relatedIncidentIds,
    deploymentSha: event.data.deploymentSha as string | undefined
  }))
}

// Aggregate logs from multiple sources
export function aggregateLogs(
  startTime?: string,
  endTime?: string
): LogEntry[] {
  const logs: LogEntry[] = []
  
  // Load stored logs
  const storedLogs = startTime || endTime
    ? getLogsByTimeRange(startTime || '1970-01-01', endTime)
    : loadLogs()
  logs.push(...storedLogs)
  
  // Convert events to logs
  const events = startTime || endTime
    ? loadEvents().filter((e) => {
        const eventTime = new Date(e.timestamp).getTime()
        const start = startTime ? new Date(startTime).getTime() : 0
        const end = endTime ? new Date(endTime).getTime() : Date.now()
        return eventTime >= start && eventTime <= end
      })
    : loadEvents()
  logs.push(...convertEventsToLogs(events))
  
  // Sort by timestamp (newest first)
  logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  
  return logs
}

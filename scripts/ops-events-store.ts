import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { OpsEvent } from '../src/types/opsEvents'

const IS_SERVERLESS = process.env.VERCEL === '1'
const EVENTS_FILE = path.join(process.cwd(), 'ops-state', 'events.json')

// In-memory store for serverless environments
let memoryStore: OpsEvent[] = []

function ensureFile() {
  if (IS_SERVERLESS) return
  try {
    if (!fs.existsSync(path.dirname(EVENTS_FILE))) {
      fs.mkdirSync(path.dirname(EVENTS_FILE), { recursive: true })
    }
    if (!fs.existsSync(EVENTS_FILE)) {
      fs.writeFileSync(EVENTS_FILE, '[]', 'utf8')
    }
  } catch (error) {
    console.warn('ops-events-store: unable to ensure storage file', error)
  }
}

export function loadEvents(): OpsEvent[] {
  if (IS_SERVERLESS) {
    return memoryStore
  }
  ensureFile()
  try {
    const raw = fs.readFileSync(EVENTS_FILE, 'utf8')
    return JSON.parse(raw) as OpsEvent[]
  } catch {
    return []
  }
}

export function saveEvents(events: OpsEvent[]) {
  if (IS_SERVERLESS) {
    memoryStore = events
    console.warn('Ops store in read-only mode: persistence unavailable.')
    return
  }
  ensureFile()
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8')
  } catch (error) {
    throw new Error(
      `ops-events-store: failed to persist events (is ops-state writable?): ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export function createEvent(
  partial: Omit<OpsEvent, 'id' | 'timestamp'>
): OpsEvent {
  const now = new Date().toISOString()
  const { data: partialData, ...rest } = partial
  const event: OpsEvent = {
    id: randomUUID(),
    timestamp: now,
    data: { ...partialData },
    ...rest
  }
  const all = loadEvents()
  all.push(event)
  saveEvents(all)
  return event
}

export function getEvent(id: string): OpsEvent | null {
  const all = loadEvents()
  return all.find((e) => e.id === id) || null
}

export function getEventsByIncident(incidentId: string): OpsEvent[] {
  const all = loadEvents()
  return all.filter((e) => e.relatedIncidentIds?.includes(incidentId))
}

export function getEventsByTimeRange(
  startTime: string,
  endTime?: string
): OpsEvent[] {
  const all = loadEvents()
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()
  
  return all.filter((e) => {
    const eventTime = new Date(e.timestamp).getTime()
    return eventTime >= start && eventTime <= end
  })
}

export function getEventsByType(type: string): OpsEvent[] {
  const all = loadEvents()
  return all.filter((e) => e.type === type)
}

export function getEventsBySeverity(severity: string): OpsEvent[] {
  const all = loadEvents()
  return all.filter((e) => e.severity === severity)
}


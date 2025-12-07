import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Incident, IncidentStatus } from '../src/types/incidents'

const IS_SERVERLESS = process.env.VERCEL === '1'
const INCIDENTS_FILE = path.join(process.cwd(), 'ops-state', 'incidents.json')

// In-memory store for serverless environments
let memoryStore: Incident[] = []

function ensureFile() {
  if (IS_SERVERLESS) return
  try {
    if (!fs.existsSync(path.dirname(INCIDENTS_FILE))) {
      fs.mkdirSync(path.dirname(INCIDENTS_FILE), { recursive: true })
    }
    if (!fs.existsSync(INCIDENTS_FILE)) {
      fs.writeFileSync(INCIDENTS_FILE, '[]', 'utf8')
    }
  } catch (error) {
    console.warn('incidents-store: unable to ensure storage file', error)
  }
}

export function loadIncidents(): Incident[] {
  if (IS_SERVERLESS) {
    return memoryStore
  }
  ensureFile()
  try {
    const raw = fs.readFileSync(INCIDENTS_FILE, 'utf8')
    return JSON.parse(raw) as Incident[]
  } catch {
    return []
  }
}

export function saveIncidents(incidents: Incident[]) {
  if (IS_SERVERLESS) {
    memoryStore = incidents
    console.warn('Ops store in read-only mode: persistence unavailable.')
    return
  }
  ensureFile()
  try {
    fs.writeFileSync(INCIDENTS_FILE, JSON.stringify(incidents, null, 2), 'utf8')
  } catch (error) {
    throw new Error(
      `incidents-store: failed to persist incidents (is ops-state writable?): ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export function createIncident(
  partial: Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Incident {
  const now = new Date().toISOString()
  const { metadata: partialMetadata, ...rest } = partial
  const incident: Incident = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'open',
    metadata: { ...partialMetadata },
    ...rest
  }
  const all = loadIncidents()
  all.push(incident)
  saveIncidents(all)
  return incident
}

export function updateIncident(
  id: string,
  updates: Partial<Incident>
): Incident | null {
  const all = loadIncidents()
  const idx = all.findIndex((i) => i.id === id)
  if (idx === -1) return null
  const now = new Date().toISOString()
  const existing = all[idx]
  
  // Handle status transitions
  if (updates.status === 'resolved' && existing.status !== 'resolved') {
    updates.resolvedAt = now
  }
  if (updates.status === 'closed' && existing.status !== 'closed') {
    updates.closedAt = now
  }
  
  all[idx] = {
    ...existing,
    ...updates,
    updatedAt: now
  }
  saveIncidents(all)
  return all[idx]
}

export function getIncident(id: string): Incident | null {
  const all = loadIncidents()
  return all.find((i) => i.id === id) || null
}

export function getOpenIncidents(): Incident[] {
  const all = loadIncidents()
  return all.filter((i) => 
    i.status === 'open' || 
    i.status === 'investigating' || 
    i.status === 'mitigating'
  )
}

export function addSignalToIncident(
  incidentId: string,
  signal: Incident['signals'][0]
): Incident | null {
  const incident = getIncident(incidentId)
  if (!incident) return null
  
  return updateIncident(incidentId, {
    signals: [...incident.signals, signal]
  })
}


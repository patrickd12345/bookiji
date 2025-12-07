import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { OpsAction, ActionStatus } from '../types/opsActions'

const IS_SERVERLESS = process.env.VERCEL === '1'
const ACTIONS_FILE = path.join(process.cwd(), 'ops-state', 'actions.json')

// In-memory store for serverless environments
let memoryStore: OpsAction[] = []

function ensureFile() {
  if (IS_SERVERLESS) return
  try {
    if (!fs.existsSync(path.dirname(ACTIONS_FILE))) {
      fs.mkdirSync(path.dirname(ACTIONS_FILE), { recursive: true })
    }
    if (!fs.existsSync(ACTIONS_FILE)) {
      fs.writeFileSync(ACTIONS_FILE, '[]', 'utf8')
    }
  } catch (error) {
    console.warn('ops-actions-store: unable to ensure storage file', error)
  }
}

export function loadActions(): OpsAction[] {
  if (IS_SERVERLESS) {
    return memoryStore
  }
  ensureFile()
  try {
    const raw = fs.readFileSync(ACTIONS_FILE, 'utf8')
    return JSON.parse(raw) as OpsAction[]
  } catch {
    return []
  }
}

export function saveActions(actions: OpsAction[]) {
  if (IS_SERVERLESS) {
    memoryStore = actions
    console.warn('Ops store in read-only mode: persistence unavailable.')
    return
  }
  ensureFile()
  try {
    fs.writeFileSync(ACTIONS_FILE, JSON.stringify(actions, null, 2), 'utf8')
  } catch (error) {
    throw new Error(
      `ops-actions-store: failed to persist actions (is ops-state writable?): ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export function createAction(
  partial: Omit<OpsAction, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): OpsAction {
  const now = new Date().toISOString()
  const action: OpsAction = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    ...partial
  }
  const all = loadActions()
  all.push(action)
  saveActions(all)
  return action
}

export function updateActionStatus(
  id: string,
  status: ActionStatus,
  opts?: { decidedBy?: string; snoozeUntil?: string | null }
): OpsAction | null {
  const all = loadActions()
  const idx = all.findIndex((a) => a.id === id)
  if (idx === -1) return null
  const now = new Date().toISOString()
  const existing = all[idx]
  all[idx] = {
    ...existing,
    status,
    updatedAt: now,
    decidedBy: opts?.decidedBy ?? existing.decidedBy,
    decidedAt: now,
    snoozeUntil: opts?.snoozeUntil ?? existing.snoozeUntil
  }
  saveActions(all)
  return all[idx]
}

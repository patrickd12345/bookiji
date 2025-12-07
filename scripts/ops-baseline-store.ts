import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Baseline } from '../src/lib/regression/regressionAI'

const IS_SERVERLESS = process.env.VERCEL === '1'
const BASELINE_DIR = path.join(process.cwd(), 'ops', 'baseline')

// In-memory store for serverless environments (keyed by metricType_endpoint)
const memoryBaselines = new Map<string, Baseline[]>()

function ensureDir() {
  if (IS_SERVERLESS) return
  if (!fs.existsSync(BASELINE_DIR)) {
    fs.mkdirSync(BASELINE_DIR, { recursive: true })
  }
}

function getBaselineFile(metricType: string, endpoint?: string): string {
  ensureDir()
  const safeEndpoint = endpoint ? endpoint.replace(/[^a-zA-Z0-9]/g, '_') : 'global'
  return path.join(BASELINE_DIR, `${metricType}_${safeEndpoint}.json`)
}

export function loadBaselines(metricType?: string, endpoint?: string): Baseline[] {
  if (IS_SERVERLESS) {
    if (metricType) {
      const key = `${metricType}_${endpoint || 'global'}`
      return memoryBaselines.get(key) || []
    }
    // Return all baselines from memory
    const allBaselines: Baseline[] = []
    for (const baselines of memoryBaselines.values()) {
      allBaselines.push(...baselines)
    }
    return allBaselines
  }
  
  ensureDir()
  
  if (metricType) {
    const file = getBaselineFile(metricType, endpoint)
    if (!fs.existsSync(file)) {
      return []
    }
    try {
      const content = fs.readFileSync(file, 'utf8')
      return JSON.parse(content) as Baseline[]
    } catch {
      return []
    }
  }

  // Load all baselines
  const baselines: Baseline[] = []
  if (!fs.existsSync(BASELINE_DIR)) {
    return baselines
  }

  const files = fs.readdirSync(BASELINE_DIR).filter(f => f.endsWith('.json'))
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(BASELINE_DIR, file), 'utf8')
      const fileBaselines = JSON.parse(content) as Baseline[]
      baselines.push(...fileBaselines)
    } catch {
      // Skip invalid files
    }
  }

  return baselines
}

export function saveBaseline(baseline: Omit<Baseline, 'id' | 'timestamp'>): Baseline {
  const fullBaseline: Baseline = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...baseline
  }

  if (IS_SERVERLESS) {
    const key = `${fullBaseline.metric_type}_${fullBaseline.endpoint || 'global'}`
    const existing = memoryBaselines.get(key) || []
    
    // Keep only the most recent baseline per period
    const filtered = existing.filter(b => b.period !== fullBaseline.period)
    filtered.push(fullBaseline)
    
    // Sort by timestamp, keep most recent
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    // Keep only the 3 most recent baselines per period
    const periods = new Set(filtered.map(b => b.period))
    const toKeep: Baseline[] = []
    for (const period of periods) {
      const periodBaselines = filtered.filter(b => b.period === period).slice(0, 3)
      toKeep.push(...periodBaselines)
    }

    memoryBaselines.set(key, toKeep)
    console.warn('Ops store in read-only mode: persistence unavailable.')
    return fullBaseline
  }

  ensureDir()
  const file = getBaselineFile(fullBaseline.metric_type, fullBaseline.endpoint)
  const existing = loadBaselines(fullBaseline.metric_type, fullBaseline.endpoint)
  
  // Keep only the most recent baseline per period
  const filtered = existing.filter(b => b.period !== fullBaseline.period)
  filtered.push(fullBaseline)
  
  // Sort by timestamp, keep most recent
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  // Keep only the 3 most recent baselines per period
  const periods = new Set(filtered.map(b => b.period))
  const toKeep: Baseline[] = []
  for (const period of periods) {
    const periodBaselines = filtered.filter(b => b.period === period).slice(0, 3)
    toKeep.push(...periodBaselines)
  }

  fs.writeFileSync(file, JSON.stringify(toKeep, null, 2), 'utf8')
  return fullBaseline
}

export function getLatestBaseline(metricType: string, endpoint?: string, period: 'normal' | 'peak' | 'low' = 'normal'): Baseline | null {
  const baselines = loadBaselines(metricType, endpoint)
  const filtered = baselines.filter(b => b.period === period)
  if (filtered.length === 0) {
    return null
  }
  
  // Return most recent
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return filtered[0]
}

export function deleteBaseline(id: string): boolean {
  if (IS_SERVERLESS) {
    for (const [key, baselines] of memoryBaselines.entries()) {
      const filtered = baselines.filter(b => b.id !== id)
      if (filtered.length !== baselines.length) {
        memoryBaselines.set(key, filtered)
        return true
      }
    }
    return false
  }

  ensureDir()
  
  const files = fs.readdirSync(BASELINE_DIR).filter(f => f.endsWith('.json'))
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(BASELINE_DIR, file), 'utf8')
      const baselines = JSON.parse(content) as Baseline[]
      const filtered = baselines.filter(b => b.id !== id)
      
      if (filtered.length !== baselines.length) {
        fs.writeFileSync(path.join(BASELINE_DIR, file), JSON.stringify(filtered, null, 2), 'utf8')
        return true
      }
    } catch {
      // Skip invalid files
    }
  }
  
  return false
}

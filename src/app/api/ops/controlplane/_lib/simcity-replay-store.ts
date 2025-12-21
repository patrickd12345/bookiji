/**
 * In-memory store for replay results (bounded to latest 10).
 */

import type { SimCityReplayReport, SimCityReplayResponse } from './simcity-types'
import { stableHash } from './simcity-hash'

const MAX_REPLAYS = 10

type ReplayStoreEntry = {
  response: SimCityReplayResponse
  report?: SimCityReplayReport
  status: 'running' | 'completed' | 'failed'
  error?: string
}

const replayStore = new Map<string, ReplayStoreEntry>()

/**
 * Store a replay response.
 */
export function storeReplay(runId: string, response: SimCityReplayResponse): void {
  // Enforce max size
  if (replayStore.size >= MAX_REPLAYS) {
    // Remove oldest entry (first key)
    const firstKey = replayStore.keys().next().value
    if (firstKey) {
      replayStore.delete(firstKey)
    }
  }

  replayStore.set(runId, {
    response,
    status: 'running',
  })
}

/**
 * Update replay status and store report.
 */
export function updateReplay(
  runId: string,
  status: 'completed' | 'failed',
  report?: SimCityReplayReport,
  error?: string
): void {
  const entry = replayStore.get(runId)
  if (!entry) {
    throw new Error(`Replay ${runId} not found`)
  }

  entry.status = status
  if (report) {
    entry.report = report
  }
  if (error) {
    entry.error = error
  }
}

/**
 * Get replay response.
 */
export function getReplay(runId: string): ReplayStoreEntry | undefined {
  return replayStore.get(runId)
}

/**
 * List all replay entries.
 */
export function listReplays(): Array<{ runId: string; entry: ReplayStoreEntry }> {
  return Array.from(replayStore.entries()).map(([runId, entry]) => ({
    runId,
    entry,
  }))
}

/**
 * Generate a deterministic run ID from request parameters.
 * For true uniqueness, caller should append a timestamp or UUID if needed.
 */
export function generateRunId(
  seed: number,
  fromTick: number,
  toTick: number,
  variantCount: number,
  variantNames?: string[]
): string {
  // Include variant names for uniqueness if provided
  const variantNamesStr = variantNames?.sort().join(',') || ''
  const input = `${seed}:${fromTick}:${toTick}:${variantCount}:${variantNamesStr}`
  return `replay_${stableHash(input).slice(0, 12)}`
}


/**
 * SimCity Phase 9: Overrides Store (append-only, in-memory)
 *
 * Stores human override records in memory.
 * Append-only: no updates, no deletions.
 *
 * Phase 11+ will persist to database.
 */

import type { OverrideRecord } from './simcity-types'

const overrides: OverrideRecord[] = []

/**
 * Append a new override record.
 * Append-only: records are never modified or deleted.
 */
export function appendOverride(record: OverrideRecord): void {
  overrides.push(record)
}

/**
 * Get all overrides for a specific proposal.
 */
export function getOverridesByProposalId(proposalId: string): OverrideRecord[] {
  return overrides.filter((o) => o.proposalId === proposalId)
}

/**
 * Get all overrides (for debugging/admin purposes).
 */
export function getAllOverrides(): OverrideRecord[] {
  return [...overrides]
}

/**
 * Get override by ID.
 */
export function getOverrideById(overrideId: string): OverrideRecord | undefined {
  return overrides.find((o) => o.overrideId === overrideId)
}


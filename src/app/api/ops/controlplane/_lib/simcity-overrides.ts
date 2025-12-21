/**
 * SimCity Phase 9: Override Validation
 *
 * Validates override requests before appending.
 * Fail-closed: rejects invalid overrides.
 */

import type {
  OverrideRecord,
  PromotionDecision,
  SimCityProposal,
  OverrideActor,
  OverrideVerdict,
} from './simcity-types'

export interface OverrideRequest {
  proposalId: string
  decisionHash: string
  verdictAfter: OverrideVerdict
  justification: string
  actor: OverrideActor
}

export interface ValidateOverrideParams {
  proposal: SimCityProposal
  decision: PromotionDecision
  override: OverrideRequest
}

/**
 * Validate an override request.
 * Fail-closed: throws on any validation failure.
 *
 * @throws {Error} with message codes:
 * - OVERRIDE_NOT_ALLOWED: decision doesn't require overrides
 * - JUSTIFICATION_REQUIRED: justification is empty
 * - INSUFFICIENT_ROLE: actor role doesn't match requirements
 * - DECISION_HASH_MISMATCH: decisionHash doesn't match decision
 */
export function validateOverride({
  proposal,
  decision,
  override,
}: ValidateOverrideParams): void {
  // Check that decision requires overrides
  if (!decision.requiredOverrides || decision.requiredOverrides.length === 0) {
    throw new Error('OVERRIDE_NOT_ALLOWED')
  }

  // Check justification is provided
  if (!override.justification?.trim()) {
    throw new Error('JUSTIFICATION_REQUIRED')
  }

  // Check actor role matches at least one requirement
  const roleMatches = decision.requiredOverrides.some(
    (r) => r.roleRequired === override.actor.role
  )
  if (!roleMatches) {
    throw new Error('INSUFFICIENT_ROLE')
  }

  // Check decisionHash matches
  if (override.decisionHash !== decision.decisionHash) {
    throw new Error('DECISION_HASH_MISMATCH')
  }

  // Verify proposalId matches
  if (override.proposalId !== proposal.id || override.proposalId !== decision.proposalId) {
    throw new Error('PROPOSAL_ID_MISMATCH')
  }
}

/**
 * Convert GovernanceVerdict to OverrideVerdict.
 */
export function convertToOverrideVerdict(verdict: string): OverrideVerdict {
  const upper = verdict.toUpperCase()
  if (upper === 'ALLOW' || upper === 'WARN' || upper === 'BLOCK') {
    return upper as OverrideVerdict
  }
  throw new Error(`Invalid verdict: ${verdict}`)
}


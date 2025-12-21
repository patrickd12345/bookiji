/**
 * SimCity Phase 7: Governance Hashing
 *
 * Deterministic hashing for governance decisions and contexts.
 * Excludes volatile fields like timestamps, runId, generatedAt.
 *
 * Phase 9: Override record hashing
 */

import crypto from 'node:crypto'
import { stableStringify } from './simcity-hash'
import type { GovernanceContext, PromotionDecision, OverrideRecord } from './simcity-types'

// Re-export stableStringify for convenience
export { stableStringify }

/**
 * Hash a stable JSON representation of an object.
 */
export function hashStableJson(obj: unknown): string {
  const json = stableStringify(obj)
  return crypto.createHash('sha256').update(json).digest('hex')
}

/**
 * Hash a minimal subset of governance context for inputsHash.
 * Excludes volatile fields and focuses on evaluation inputs.
 */
export function hashGovernanceContext(ctx: GovernanceContext): string {
  // Extract minimal subset for hashing
  const ctxSubset = {
    tick: ctx.tick,
    proposal: {
      id: ctx.proposal.id,
      domain: ctx.proposal.domain,
      action: ctx.proposal.action,
      confidence: ctx.proposal.confidence,
    },
    dialsSnapshot: ctx.dialsSnapshot
      ? ctx.dialsSnapshot.map((d) => ({ metric: d.metric, value: d.value, zone: d.zone })).sort((a, b) => a.metric.localeCompare(b.metric))
      : undefined,
    replayEvaluation: ctx.replayEvaluation
      ? {
          baseAllowed: ctx.replayEvaluation.base?.allowed,
          variantAllowed: ctx.replayEvaluation.variant?.allowed,
          deltas: ctx.replayEvaluation.deltas
            ? ctx.replayEvaluation.deltas
                .map((d) => ({ id: d.id, delta: d.delta, direction: d.direction }))
                .sort((a, b) => a.id.localeCompare(b.id))
            : undefined,
        }
      : undefined,
    replayReportHash: ctx.replayReportSummary?.reportHash,
  }

  return hashStableJson(ctxSubset)
}

/**
 * Hash decision content for decisionHash.
 * Includes immutable decision fields (excludes evaluatedAtTick which is metadata).
 */
export function hashDecision(decision: Omit<PromotionDecision, 'evaluatedAtTick' | 'inputsHash' | 'decisionHash'>): string {
  // Sort reasons and overrides for determinism
  const sortedReasons = [...decision.reasons].sort((a, b) => {
    const severityOrder = { block: 0, warn: 1, info: 2 }
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    return a.ruleId.localeCompare(b.ruleId)
  })

  const sortedOverrides = decision.requiredOverrides
    ? [...decision.requiredOverrides].sort((a, b) => {
        const roleOrder = { exec: 0, safety: 1, admin: 2 }
        const roleDiff = roleOrder[a.roleRequired] - roleOrder[b.roleRequired]
        if (roleDiff !== 0) return roleDiff
        return a.reason.localeCompare(b.reason)
      })
    : undefined

  const decisionContent = {
    proposalId: decision.proposalId,
    domain: decision.domain,
    action: decision.action,
    verdict: decision.verdict,
    reasons: sortedReasons.map((r) => ({
      ruleId: r.ruleId,
      severity: r.severity,
      message: r.message,
      evidence: r.evidence ? stableStringify(r.evidence) : undefined,
    })),
    requiredOverrides: sortedOverrides?.map((o) => ({
      reason: o.reason,
      roleRequired: o.roleRequired,
      expiresAfterTicks: o.expiresAfterTicks,
    })),
  }

  return hashStableJson(decisionContent)
}

/**
 * Phase 9: Hash override record for overrideHash.
 * Excludes overrideHash itself (hash of everything else).
 */
export function hashOverrideRecord(record: Omit<OverrideRecord, 'overrideHash'>): string {
  return hashStableJson(record)
}


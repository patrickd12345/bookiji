/**
 * SimCity Phase 7: Governance Engine
 *
 * Evaluates proposals using rules, dials, and replay evaluations.
 * Produces deterministic promotion decisions (allow/warn/block).
 */

import type {
  GovernanceContext,
  GovernanceVerdict,
  GovernanceReason,
  OverrideRequirement,
  PromotionDecision,
  SimCityProposal,
  DialStatus,
} from './simcity-types'
import { DEFAULT_GOVERNANCE_RULES } from './simcity-governance-rules'
import { hashGovernanceContext, hashDecision } from './simcity-governance-hash'

/**
 * Escalate verdict: allow < warn < block
 */
function escalateVerdict(current: GovernanceVerdict, newVerdict: GovernanceVerdict): GovernanceVerdict {
  const order = { allow: 0, warn: 1, block: 2 }
  return order[newVerdict] > order[current] ? newVerdict : current
}

/**
 * Evaluate a single proposal using governance rules.
 */
export function evaluateProposal(ctx: GovernanceContext): PromotionDecision {
  // Fail-closed: validate required inputs
  if (!ctx.proposal || !ctx.tick) {
    const decisionContent = {
      proposalId: ctx.proposal?.id || 'unknown',
      domain: ctx.proposal?.domain || 'unknown',
      action: ctx.proposal?.action || 'unknown',
      verdict: 'block' as const,
      reasons: [
        {
          ruleId: 'missing-context',
          severity: 'block' as const,
          message: 'Missing required context: proposal or tick',
        },
      ],
    }
    const inputsHash = hashGovernanceContext(ctx)
    const decisionHash = hashDecision(decisionContent)

    return {
      ...decisionContent,
      evaluatedAtTick: ctx.tick || 0,
      inputsHash,
      decisionHash,
    }
  }

  // Fail-closed: require dials snapshot (unless proposals are explicitly off)
  if (!ctx.dialsSnapshot || ctx.dialsSnapshot.length === 0) {
    const decisionContent = {
      proposalId: ctx.proposal.id,
      domain: ctx.proposal.domain,
      action: ctx.proposal.action,
      verdict: 'block' as const,
      reasons: [
        {
          ruleId: 'missing-dials',
          severity: 'block' as const,
          message: 'Dials snapshot is required for governance evaluation',
        },
      ],
    }
    const inputsHash = hashGovernanceContext(ctx)
    const decisionHash = hashDecision(decisionContent)

    return {
      ...decisionContent,
      evaluatedAtTick: ctx.tick,
      inputsHash,
      decisionHash,
    }
  }

  // Apply rules in order
  let verdict: GovernanceVerdict = 'allow'
  const reasons: GovernanceReason[] = []
  const overrides: OverrideRequirement[] = []

  for (const rule of DEFAULT_GOVERNANCE_RULES) {
    try {
      const result = rule.evaluate(ctx)
      if (result) {
        if (result.verdict) {
          verdict = escalateVerdict(verdict, result.verdict)
        }
        if (result.reason) {
          reasons.push(result.reason)
        }
        if (result.override) {
          overrides.push(result.override)
        }
      }
    } catch (error) {
      // Rule evaluation should never throw, but if it does, fail-closed
      reasons.push({
        ruleId: rule.id,
        severity: 'block',
        message: `Rule evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
      verdict = escalateVerdict(verdict, 'block')
    }
  }

  // Sort reasons deterministically (by severity then ruleId)
  reasons.sort((a, b) => {
    const severityOrder = { block: 0, warn: 1, info: 2 }
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    return a.ruleId.localeCompare(b.ruleId)
  })

  // Sort overrides deterministically (by roleRequired then reason)
  overrides.sort((a, b) => {
    const roleOrder = { exec: 0, safety: 1, admin: 2 }
    const roleDiff = roleOrder[a.roleRequired] - roleOrder[b.roleRequired]
    if (roleDiff !== 0) return roleDiff
    return a.reason.localeCompare(b.reason)
  })

  // Compute hashes
  const inputsHash = hashGovernanceContext(ctx)

  // Build decision content (without hashes for hashing)
  const decisionContent: Omit<PromotionDecision, 'evaluatedAtTick' | 'inputsHash' | 'decisionHash'> = {
    proposalId: ctx.proposal.id,
    domain: ctx.proposal.domain,
    action: ctx.proposal.action,
    verdict,
    reasons,
    requiredOverrides: overrides.length > 0 ? overrides : undefined,
  }

  const decisionHash = hashDecision(decisionContent)

  return {
    ...decisionContent,
    evaluatedAtTick: ctx.tick,
    inputsHash,
    decisionHash,
  }
}

/**
 * Evaluate all proposals.
 */
export function evaluateAllProposals({
  tick,
  proposals,
  dialsSnapshot,
  replayEvaluation,
  replayReportSummary,
}: {
  tick: number
  proposals: SimCityProposal[]
  dialsSnapshot?: DialStatus[]
  replayEvaluation?: {
    base?: import('./simcity-types').EvaluationResult
    variant?: import('./simcity-types').EvaluationResult
    deltas?: import('./simcity-types').MetricDelta[]
  }
  replayReportSummary?: {
    reportHash: string
    markdownSummary?: string
    eventDiff?: Record<string, unknown>
  }
}): PromotionDecision[] {
  const decisions: PromotionDecision[] = []

  for (const proposal of proposals) {
    const ctx: GovernanceContext = {
      tick,
      proposal,
      dialsSnapshot,
      replayEvaluation,
      replayReportSummary,
    }

    const decision = evaluateProposal(ctx)
    decisions.push(decision)
  }

  // Sort deterministically by proposalId
  decisions.sort((a, b) => a.proposalId.localeCompare(b.proposalId))

  return decisions
}


/**
 * SimCity Phase 7: Governance Rules
 *
 * Deterministic rules that evaluate proposals and produce governance decisions.
 * Rules never throw; they return null if inputs are missing.
 */

import type {
  GovernanceContext,
  GovernanceVerdict,
  GovernanceReason,
  OverrideRequirement,
  MetricDelta,
} from './simcity-types'
import { METRICS_REGISTRY } from './simcity-metrics'

export type GovernanceRuleResult = {
  verdict?: GovernanceVerdict
  reason?: GovernanceReason
  override?: OverrideRequirement
} | null

export type GovernanceRule = {
  id: string
  description: string
  evaluate: (ctx: GovernanceContext) => GovernanceRuleResult
}

// Thresholds (constants, documented)
const TRUST_VIOLATION_RATE_THRESHOLD = 0.01 // Block if trust violation rate increases by more than 1%
const LATENCY_REGRESSION_THRESHOLD = 0.05 // Warn if latency p95 increases by more than 5%
const ERROR_RATE_REGRESSION_THRESHOLD = 0.02 // Block if error rate increases by more than 2%

/**
 * Rule: Block if any dial status is red.
 */
function blockOnRedDial(ctx: GovernanceContext): GovernanceRuleResult {
  if (!ctx.dialsSnapshot || ctx.dialsSnapshot.length === 0) {
    return null // Missing input, let fail-closed handle it
  }

  const redDials = ctx.dialsSnapshot.filter((d) => d.zone === 'red')

  if (redDials.length > 0) {
    return {
      verdict: 'block',
      reason: {
        ruleId: 'block-on-red-dial',
        severity: 'block',
        message: `${redDials.length} dial(s) in red zone`,
        evidence: {
          redDials: redDials.map((d) => ({ metric: d.metric, value: d.value })),
        },
      },
    }
  }

  return null
}

/**
 * Rule: Warn if any dial status is yellow (unless already blocked).
 */
function warnOnYellowDial(ctx: GovernanceContext): GovernanceRuleResult {
  if (!ctx.dialsSnapshot || ctx.dialsSnapshot.length === 0) {
    return null
  }

  const yellowDials = ctx.dialsSnapshot.filter((d) => d.zone === 'yellow')

  if (yellowDials.length > 0) {
    return {
      verdict: 'warn',
      reason: {
        ruleId: 'warn-on-yellow-dial',
        severity: 'warn',
        message: `${yellowDials.length} dial(s) in yellow zone`,
        evidence: {
          yellowDials: yellowDials.map((d) => ({ metric: d.metric, value: d.value })),
        },
      },
    }
  }

  return null
}

/**
 * Rule: Block if trust violation rate regression exceeds threshold.
 */
function blockOnTrustRegression(ctx: GovernanceContext): GovernanceRuleResult {
  if (!ctx.replayEvaluation?.deltas) {
    return null
  }

  const trustDelta = ctx.replayEvaluation.deltas.find((d) => d.id === 'trust.violation_rate')

  if (!trustDelta || trustDelta.direction === 'neutral') {
    return null
  }

  // Check if trust violation rate worsened (increased for lower-is-better metric)
  if (trustDelta.direction === 'degraded' && trustDelta.delta !== null) {
    const absoluteDelta = Math.abs(trustDelta.delta)
    if (absoluteDelta > TRUST_VIOLATION_RATE_THRESHOLD) {
      return {
        verdict: 'block',
        reason: {
          ruleId: 'block-on-trust-regression',
          severity: 'block',
          message: `Trust violation rate regression exceeds threshold (delta: ${trustDelta.delta.toFixed(4)})`,
          evidence: {
            base: trustDelta.base,
            variant: trustDelta.variant,
            delta: trustDelta.delta,
            threshold: TRUST_VIOLATION_RATE_THRESHOLD,
          },
        },
      }
    }
  }

  return null
}

/**
 * Rule: Warn if latency p95 regression exceeds threshold.
 */
function warnOnLatencyRegression(ctx: GovernanceContext): GovernanceRuleResult {
  if (!ctx.replayEvaluation?.deltas) {
    return null
  }

  const latencyDelta = ctx.replayEvaluation.deltas.find((d) => d.id === 'latency.p95')

  if (!latencyDelta || latencyDelta.direction === 'neutral' || latencyDelta.base === null || latencyDelta.base === 0) {
    return null
  }

  // Calculate percentage increase
  if (latencyDelta.direction === 'degraded' && latencyDelta.delta !== null) {
    const percentIncrease = Math.abs(latencyDelta.delta / latencyDelta.base)

    if (percentIncrease > LATENCY_REGRESSION_THRESHOLD) {
      return {
        verdict: 'warn',
        reason: {
          ruleId: 'warn-on-latency-regression',
          severity: 'warn',
          message: `Latency p95 regression exceeds threshold (${(percentIncrease * 100).toFixed(1)}% increase)`,
          evidence: {
            base: latencyDelta.base,
            variant: latencyDelta.variant,
            delta: latencyDelta.delta,
            percentIncrease,
            threshold: LATENCY_REGRESSION_THRESHOLD,
          },
        },
      }
    }
  }

  return null
}

/**
 * Rule: Block if error rate regression exceeds threshold.
 */
function blockOnErrorRateRegression(ctx: GovernanceContext): GovernanceRuleResult {
  if (!ctx.replayEvaluation?.deltas) {
    return null
  }

  const errorDelta = ctx.replayEvaluation.deltas.find((d) => d.id === 'error.rate')

  if (!errorDelta || errorDelta.direction === 'neutral') {
    return null
  }

  // Check if error rate worsened (increased for lower-is-better metric)
  if (errorDelta.direction === 'degraded' && errorDelta.delta !== null) {
    const absoluteDelta = Math.abs(errorDelta.delta)
    if (absoluteDelta > ERROR_RATE_REGRESSION_THRESHOLD) {
      return {
        verdict: 'block',
        reason: {
          ruleId: 'block-on-error-rate-regression',
          severity: 'block',
          message: `Error rate regression exceeds threshold (delta: ${errorDelta.delta.toFixed(4)})`,
          evidence: {
            base: errorDelta.base,
            variant: errorDelta.variant,
            delta: errorDelta.delta,
            threshold: ERROR_RATE_REGRESSION_THRESHOLD,
          },
        },
      }
    }
  }

  return null
}

/**
 * Rule: Require override for apply/promote actions.
 */
function requireOverrideForApply(ctx: GovernanceContext): GovernanceRuleResult {
  const action = ctx.proposal.action.toLowerCase()

  if (action.includes('apply') || action.includes('promote') || action.includes('execute')) {
    return {
      verdict: 'warn', // Downgrade to warn with override requirement
      reason: {
        ruleId: 'require-override-for-apply',
        severity: 'warn',
        message: 'Action suggests apply/promote/execute - override required',
        evidence: {
          action: ctx.proposal.action,
        },
      },
      override: {
        reason: 'Action requires explicit approval for apply/promote/execute operations',
        roleRequired: 'admin',
        expiresAfterTicks: 100, // Expires after 100 ticks
      },
    }
  }

  return null
}

/**
 * Default governance rules registry.
 * Rules are evaluated in order; first block wins, then warn.
 */
export const DEFAULT_GOVERNANCE_RULES: GovernanceRule[] = [
  {
    id: 'block-on-red-dial',
    description: 'Block if any dial status is red',
    evaluate: blockOnRedDial,
  },
  {
    id: 'block-on-trust-regression',
    description: 'Block if trust violation rate regression exceeds threshold',
    evaluate: blockOnTrustRegression,
  },
  {
    id: 'block-on-error-rate-regression',
    description: 'Block if error rate regression exceeds threshold',
    evaluate: blockOnErrorRateRegression,
  },
  {
    id: 'warn-on-yellow-dial',
    description: 'Warn if any dial status is yellow',
    evaluate: warnOnYellowDial,
  },
  {
    id: 'warn-on-latency-regression',
    description: 'Warn if latency p95 regression exceeds threshold',
    evaluate: warnOnLatencyRegression,
  },
  {
    id: 'require-override-for-apply',
    description: 'Require override for apply/promote/execute actions',
    evaluate: requireOverrideForApply,
  },
]








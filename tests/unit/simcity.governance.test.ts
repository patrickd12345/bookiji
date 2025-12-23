import { describe, it, expect } from 'vitest'
import { evaluateProposal, evaluateAllProposals } from '@/app/api/ops/controlplane/_lib/simcity-governance'
import type {
  GovernanceContext,
  SimCityProposal,
  DialStatus,
  MetricDelta,
  EvaluationResult,
} from '@/app/api/ops/controlplane/_lib/simcity-types'

describe('SimCity governance (unit)', () => {
  function createMockProposal(
    id: string,
    domain: string,
    action: string,
    confidence: number = 0.8
  ): SimCityProposal {
    return {
      id,
      tick: 10,
      domain,
      action,
      description: `Test proposal ${id}`,
      confidence,
      evidenceEventIds: [],
      source: 'rules',
    }
  }

  function createMockDialStatus(metric: string, value: number, zone: 'green' | 'yellow' | 'red'): DialStatus {
    return {
      metric: metric as any,
      value,
      zone,
    }
  }

  it('determinism: same ctx → same decisionHash and inputsHash', () => {
    const proposal = createMockProposal('prop1', 'booking-load', 'throttle_booking_acceptance')
    const dialsSnapshot: DialStatus[] = [
      createMockDialStatus('booking.success_rate', 0.95, 'green'),
      createMockDialStatus('error.rate', 0.01, 'green'),
    ]

    const ctx: GovernanceContext = {
      tick: 10,
      proposal,
      dialsSnapshot,
    }

    const decision1 = evaluateProposal(ctx)
    const decision2 = evaluateProposal(ctx)

    expect(decision1.decisionHash).toBe(decision2.decisionHash)
    expect(decision1.inputsHash).toBe(decision2.inputsHash)
    expect(decision1.verdict).toBe(decision2.verdict)
  })

  it('red dial blocks', () => {
    const proposal = createMockProposal('prop1', 'booking-load', 'throttle_booking_acceptance')
    const dialsSnapshot: DialStatus[] = [
      createMockDialStatus('booking.success_rate', 0.85, 'red'), // Red dial
      createMockDialStatus('error.rate', 0.01, 'green'),
    ]

    const ctx: GovernanceContext = {
      tick: 10,
      proposal,
      dialsSnapshot,
    }

    const decision = evaluateProposal(ctx)

    expect(decision.verdict).toBe('block')
    expect(decision.reasons.some((r) => r.ruleId === 'block-on-red-dial')).toBe(true)
  })

  it('yellow dial warns', () => {
    const proposal = createMockProposal('prop1', 'booking-load', 'throttle_booking_acceptance')
    const dialsSnapshot: DialStatus[] = [
      createMockDialStatus('booking.success_rate', 0.92, 'yellow'), // Yellow dial
      createMockDialStatus('error.rate', 0.01, 'green'),
    ]

    const ctx: GovernanceContext = {
      tick: 10,
      proposal,
      dialsSnapshot,
    }

    const decision = evaluateProposal(ctx)

    expect(decision.verdict).toBe('warn')
    expect(decision.reasons.some((r) => r.ruleId === 'warn-on-yellow-dial')).toBe(true)
  })

  it('missing dials blocks (fail-closed)', () => {
    const proposal = createMockProposal('prop1', 'booking-load', 'throttle_booking_acceptance')

    const ctx: GovernanceContext = {
      tick: 10,
      proposal,
      dialsSnapshot: undefined, // Missing dials
    }

    const decision = evaluateProposal(ctx)

    expect(decision.verdict).toBe('block')
    expect(decision.reasons.some((r) => r.ruleId === 'missing-dials')).toBe(true)
  })

  it('trust regression blocks when delta worsens beyond threshold', () => {
    const proposal = createMockProposal('prop1', 'booking-load', 'throttle_booking_acceptance')
    const dialsSnapshot: DialStatus[] = [
      createMockDialStatus('trust.violation_rate', 0.001, 'green'),
      createMockDialStatus('error.rate', 0.01, 'green'),
    ]

    const deltas: MetricDelta[] = [
      {
        id: 'trust.violation_rate',
        base: 0.001,
        variant: 0.015, // Regression > 0.01 threshold
        delta: 0.014,
        direction: 'degraded',
      },
    ]

    const ctx: GovernanceContext = {
      tick: 10,
      proposal,
      dialsSnapshot,
      replayEvaluation: {
        deltas,
      },
    }

    const decision = evaluateProposal(ctx)

    expect(decision.verdict).toBe('block')
    expect(decision.reasons.some((r) => r.ruleId === 'block-on-trust-regression')).toBe(true)
  })

  it('latency regression warns at >5%', () => {
    const proposal = createMockProposal('prop1', 'booking-load', 'throttle_booking_acceptance')
    const dialsSnapshot: DialStatus[] = [
      createMockDialStatus('latency.p95', 200, 'green'),
      createMockDialStatus('error.rate', 0.01, 'green'),
    ]

    const deltas: MetricDelta[] = [
      {
        id: 'latency.p95',
        base: 200,
        variant: 220, // 10% increase > 5% threshold
        delta: 20,
        direction: 'degraded',
      },
    ]

    const ctx: GovernanceContext = {
      tick: 10,
      proposal,
      dialsSnapshot,
      replayEvaluation: {
        deltas,
      },
    }

    const decision = evaluateProposal(ctx)

    expect(decision.verdict).toBe('warn')
    expect(decision.reasons.some((r) => r.ruleId === 'warn-on-latency-regression')).toBe(true)
  })

  it('apply/promote action requires override', () => {
    const proposal = createMockProposal('prop1', 'booking-load', 'apply_throttle')
    const dialsSnapshot: DialStatus[] = [
      createMockDialStatus('booking.success_rate', 0.95, 'green'),
      createMockDialStatus('error.rate', 0.01, 'green'),
    ]

    const ctx: GovernanceContext = {
      tick: 10,
      proposal,
      dialsSnapshot,
    }

    const decision = evaluateProposal(ctx)

    expect(decision.requiredOverrides).toBeDefined()
    expect(decision.requiredOverrides?.length).toBeGreaterThan(0)
    expect(decision.requiredOverrides?.some((o) => o.roleRequired === 'admin')).toBe(true)
    expect(decision.reasons.some((r) => r.ruleId === 'require-override-for-apply')).toBe(true)
  })

  it('ordering stable: reasons and overrides are stable order', () => {
    const proposal = createMockProposal('prop1', 'booking-load', 'apply_throttle')
    const dialsSnapshot: DialStatus[] = [
      createMockDialStatus('booking.success_rate', 0.92, 'yellow'),
      createMockDialStatus('error.rate', 0.05, 'red'),
    ]

    const ctx: GovernanceContext = {
      tick: 10,
      proposal,
      dialsSnapshot,
    }

    const decision1 = evaluateProposal(ctx)
    const decision2 = evaluateProposal(ctx)

    // Reasons should be in same order
    expect(decision1.reasons.map((r) => r.ruleId)).toEqual(decision2.reasons.map((r) => r.ruleId))

    // Overrides should be in same order
    if (decision1.requiredOverrides && decision2.requiredOverrides) {
      expect(decision1.requiredOverrides.map((o) => o.roleRequired)).toEqual(
        decision2.requiredOverrides.map((o) => o.roleRequired)
      )
    }
  })

  it('evaluateAllProposals returns sorted decisions', () => {
    const proposals: SimCityProposal[] = [
      createMockProposal('prop3', 'booking-load', 'action3'),
      createMockProposal('prop1', 'booking-load', 'action1'),
      createMockProposal('prop2', 'booking-load', 'action2'),
    ]

    const dialsSnapshot: DialStatus[] = [
      createMockDialStatus('booking.success_rate', 0.95, 'green'),
      createMockDialStatus('error.rate', 0.01, 'green'),
    ]

    const decisions = evaluateAllProposals({
      tick: 10,
      proposals,
      dialsSnapshot,
    })

    // Should be sorted by proposalId
    expect(decisions.map((d) => d.proposalId)).toEqual(['prop1', 'prop2', 'prop3'])
  })

  it('error rate regression blocks when delta exceeds threshold', () => {
    const proposal = createMockProposal('prop1', 'booking-load', 'throttle_booking_acceptance')
    const dialsSnapshot: DialStatus[] = [
      createMockDialStatus('error.rate', 0.01, 'green'),
    ]

    const deltas: MetricDelta[] = [
      {
        id: 'error.rate',
        base: 0.01,
        variant: 0.035, // Regression > 0.02 threshold
        delta: 0.025,
        direction: 'degraded',
      },
    ]

    const ctx: GovernanceContext = {
      tick: 10,
      proposal,
      dialsSnapshot,
      replayEvaluation: {
        deltas,
      },
    }

    const decision = evaluateProposal(ctx)

    expect(decision.verdict).toBe('block')
    expect(decision.reasons.some((r) => r.ruleId === 'block-on-error-rate-regression')).toBe(true)
  })

  it('allows proposal when all dials green and no regressions', () => {
    const proposal = createMockProposal('prop1', 'booking-load', 'throttle_booking_acceptance')
    const dialsSnapshot: DialStatus[] = [
      createMockDialStatus('booking.success_rate', 0.98, 'green'),
      createMockDialStatus('error.rate', 0.005, 'green'),
      createMockDialStatus('latency.p95', 150, 'green'),
    ]

    const ctx: GovernanceContext = {
      tick: 10,
      proposal,
      dialsSnapshot,
    }

    const decision = evaluateProposal(ctx)

    expect(decision.verdict).toBe('allow')
    expect(decision.reasons.length).toBe(0)
  })
})


















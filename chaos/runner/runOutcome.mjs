export const RunOutcomeStatus = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  PARTIAL: 'PARTIAL'
})

export const META_INVARIANTS = Object.freeze([
  'I-INGRESS-1',
  'I-AUTH-SESSION-1',
  'I-AUTHZ-CAPABILITY-1',
  'I-TIMEBASE-1',
  'I-SNAPSHOT-INTEGRITY-1',
  'I-ESCALATION-INVARIANTS-1'
])

function buildKey(prefix, invariantId, detail, type) {
  const safeDetail = detail ? detail.replace(/\s+/g, ' ').trim() : ''
  const safeType = type ?? ''
  return `${prefix}|${invariantId}|${safeType}|${safeDetail}`
}

export function createRunOutcome({ requiredInvariantIds = [] } = {}) {
  const outcome = {
    status: null,
    proofs: [],
    violations: [],
    requiredInvariantIds: Array.from(new Set(requiredInvariantIds))
  }

  Object.defineProperty(outcome, '_proofKeys', {
    value: new Set(),
    enumerable: false,
    writable: true
  })
  Object.defineProperty(outcome, '_violationKeys', {
    value: new Set(),
    enumerable: false,
    writable: true
  })

  return outcome
}

export function registerProof(outcome, proof = {}) {
  if (!outcome || !proof.invariantId) return
  const key = buildKey('proof', proof.invariantId, proof.detail, proof.type)
  if (outcome._proofKeys.has(key)) return
  outcome._proofKeys.add(key)
  outcome.proofs.push({
    invariantId: proof.invariantId,
    detail: proof.detail || 'Invariant proof recorded',
    type: proof.type || 'invariant',
    metadata: proof.metadata
  })
}

export function registerViolation(outcome, violation = {}) {
  if (!outcome || !violation.invariantId) return
  const key = buildKey('violation', violation.invariantId, violation.detail, violation.type)
  if (outcome._violationKeys.has(key)) return
  outcome._violationKeys.add(key)
  outcome.violations.push({
    invariantId: violation.invariantId,
    type: violation.type || 'invariant',
    detail: violation.detail || 'Invariant violation recorded',
    metadata: violation.metadata
  })
}

function ensureRequiredProofs(outcome) {
  if (!outcome || !Array.isArray(outcome.requiredInvariantIds) || outcome.requiredInvariantIds.length === 0) {
    return true
  }
  const seen = new Set(outcome.proofs.map(p => p.invariantId))
  const missing = outcome.requiredInvariantIds.filter(id => !seen.has(id))

  for (const invariantId of missing) {
    registerViolation(outcome, {
      invariantId,
      type: 'missing-proof',
      detail: `Missing proof for required invariant ${invariantId}`
    })
  }

  return missing.length === 0
}

export function finalizeRunOutcome(outcome, { intendedStatus = RunOutcomeStatus.SUCCESS } = {}) {
  if (!outcome) return null

  ensureRequiredProofs(outcome)

  if (outcome.violations.length > 0) {
    outcome.status = RunOutcomeStatus.FAILURE
  } else if (intendedStatus === RunOutcomeStatus.PARTIAL) {
    outcome.status = RunOutcomeStatus.PARTIAL
  } else if (intendedStatus === RunOutcomeStatus.FAILURE) {
    outcome.status = RunOutcomeStatus.FAILURE
  } else {
    outcome.status = RunOutcomeStatus.SUCCESS
  }

  return outcome.status
}

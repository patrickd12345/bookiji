function buildProof(invariantId, detail, metadata) {
  return {
    invariantId,
    detail,
    metadata
  }
}

function buildViolation(invariantId, type, detail, metadata) {
  return {
    invariantId,
    type,
    detail,
    metadata
  }
}

export function assertInvariant(invariantId, state, expectation) {
  if (expectation.type === 'cardinality') {
    return assertCardinality(invariantId, state, expectation)
  } else if (expectation.type === 'equality') {
    return assertEquality(invariantId, state, expectation)
  } else if (expectation.type === 'coherence') {
    return assertCoherence(invariantId, state, expectation)
  } else if (expectation.type === 'idempotency') {
    return assertIdempotency(invariantId, state, expectation)
  } else {
    const message = `Unknown expectation type: ${expectation.type}`
    return {
      pass: false,
      message,
      violations: [buildViolation(invariantId, 'unknown-expectation', message, { expectation })]
    }
  }
}

function assertCardinality(invariantId, state, expectation) {
  const { field, max, min } = expectation
  
  let count
  if (field === 'bookings') {
    count = Array.isArray(state.bookings) ? state.bookings.length : 0
  } else if (field === 'slots') {
    count = Array.isArray(state.slots) ? state.slots.length : 0
  } else {
    count = state[field]?.length || 0
  }

  const detail = `Cardinality ${field} count ${count}${typeof max === 'number' ? ` <= ${max}` : ''}${typeof min === 'number' ? ` >= ${min}` : ''}`

  if (max !== undefined && count > max) {
    const message = `Cardinality violation: ${field} count ${count} exceeds max ${max}`
    return {
      pass: false,
      message,
      violations: [buildViolation(invariantId, 'cardinality', message, { field, count, max, expectation })]
    }
  }

  if (min !== undefined && count < min) {
    const message = `Cardinality violation: ${field} count ${count} below min ${min}`
    return {
      pass: false,
      message,
      violations: [buildViolation(invariantId, 'cardinality', message, { field, count, min, expectation })]
    }
  }

  return {
    pass: true,
    message: detail,
    proofs: [buildProof(invariantId, detail, { field, count, min, max })]
  }
}

function assertEquality(invariantId, state, expectation) {
  const { field, value } = expectation
  const actual = getNestedValue(state, field)

  if (actual !== value) {
    const message = `Equality violation: ${field} = ${actual}, expected ${value}`
    return {
      pass: false,
      message,
      violations: [buildViolation(invariantId, 'equality', message, { field, actual, expected: value })]
    }
  }

  const detail = `Equality asserted: ${field} = ${actual}`
  return {
    pass: true,
    message: detail,
    proofs: [buildProof(invariantId, detail, { field, value: actual })]
  }
}

function assertCoherence(invariantId, state, expectation) {
  const { condition, then } = expectation

  // Evaluate condition
  const conditionMet = evaluateCondition(state, condition)

  if (conditionMet) {
    // Check 'then' expectations
    for (const [field, expectedValue] of Object.entries(then)) {
      const actual = getNestedValue(state, field)
      if (actual !== expectedValue) {
        const message = `Coherence violation: condition met but ${field} = ${actual}, expected ${expectedValue}`
        return {
          pass: false,
          message,
          violations: [buildViolation(invariantId, 'coherence', message, { condition, field, actual, expectedValue })]
        }
      }
    }

    const detail = `Coherence satisfied: ${Object.keys(then).join(', ')} aligned under condition`
    return {
      pass: true,
      message: detail,
      proofs: [buildProof(invariantId, detail, { condition, then })]
    }
  }

  const detail = `Coherence dormant: condition ${condition.field} not met`
  return {
    pass: true,
    message: detail,
    proofs: [buildProof(invariantId, detail, { condition })]
  }
}

function assertIdempotency(invariantId, state, expectation) {
  const { before, after } = state
  const fields = expectation.fields || []

  const changedFields = []
  for (const field of fields) {
    const beforeVal = getNestedValue(before, field)
    const afterVal = getNestedValue(after, field)
    
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changedFields.push({ field, before: beforeVal, after: afterVal })
    }
  }

  if (changedFields.length > 0) {
    const field = changedFields[0]
    const message = `Idempotency violation: ${field.field} changed from ${JSON.stringify(field.before)} to ${JSON.stringify(field.after)}`
    return {
      pass: false,
      message,
      violations: [buildViolation(invariantId, 'idempotency', message, { changedFields })]
    }
  }

  const detail = `Idempotency asserted for fields: ${fields.join(', ')}`
  return {
    pass: true,
    message: detail,
    proofs: [buildProof(invariantId, detail, { fields })]
  }
}

function getNestedValue(obj, path) {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  return current
}

function evaluateCondition(state, condition) {
  if (condition.field && condition.operator && condition.value !== undefined) {
    const actual = getNestedValue(state, condition.field)
    switch (condition.operator) {
      case '==': return actual == condition.value
      case '===': return actual === condition.value
      case '!=': return actual != condition.value
      case '!==': return actual !== condition.value
      case '>': return actual > condition.value
      case '>=': return actual >= condition.value
      case '<': return actual < condition.value
      case '<=': return actual <= condition.value
      default: return false
    }
  }
  return false
}

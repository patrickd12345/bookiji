export function assertInvariant(invariantId, state, expectation) {
  // Pure function: state + expectation → pass/fail
  // No side effects, no business logic interpretation

  if (expectation.type === 'cardinality') {
    return assertCardinality(invariantId, state, expectation)
  } else if (expectation.type === 'equality') {
    return assertEquality(invariantId, state, expectation)
  } else if (expectation.type === 'coherence') {
    return assertCoherence(invariantId, state, expectation)
  } else if (expectation.type === 'idempotency') {
    return assertIdempotency(invariantId, state, expectation)
  } else {
    return {
      pass: false,
      message: `Unknown expectation type: ${expectation.type}`
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

  if (max !== undefined && count > max) {
    return {
      pass: false,
      message: `Cardinality violation: ${field} count ${count} exceeds max ${max}`
    }
  }

  if (min !== undefined && count < min) {
    return {
      pass: false,
      message: `Cardinality violation: ${field} count ${count} below min ${min}`
    }
  }

  return { pass: true }
}

function assertEquality(invariantId, state, expectation) {
  const { field, value } = expectation
  const actual = getNestedValue(state, field)

  if (actual !== value) {
    return {
      pass: false,
      message: `Equality violation: ${field} = ${actual}, expected ${value}`
    }
  }

  return { pass: true }
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
        return {
          pass: false,
          message: `Coherence violation: condition met but ${field} = ${actual}, expected ${expectedValue}`
        }
      }
    }
  }

  return { pass: true }
}

function assertIdempotency(invariantId, state, expectation) {
  const { before, after } = state

  // Compare before and after states
  for (const field of expectation.fields) {
    const beforeVal = getNestedValue(before, field)
    const afterVal = getNestedValue(after, field)
    
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      return {
        pass: false,
        message: `Idempotency violation: ${field} changed from ${JSON.stringify(beforeVal)} to ${JSON.stringify(afterVal)}`
      }
    }
  }

  return { pass: true }
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


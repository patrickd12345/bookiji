import { ExecutionKernel } from '../kernel/index.mjs'
import { stableUuid, mulberry32, hashSeedToU32 } from '../kernel/utils.mjs'

/**
 * Generic template resolver - resolves {{path.to.value}} against runtime context
 */
function resolveTemplateDeep(obj, context) {
  if (typeof obj === 'string') {
    return obj.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      // Try to get nested value from context
      let value = getNestedValue(context, path)
      
      // If not found and path contains '.', try accessing fixture.data
      // First check context.fixtures, then top-level context
      if (value === undefined && path.includes('.') && context && typeof context === 'object') {
        const parts = path.split('.')
        if (parts.length >= 2) {
          // Try context.fixtures first (explicit container)
          let fixture = null
          if (context.fixtures && parts[0] in context.fixtures) {
            fixture = context.fixtures[parts[0]]
          } else if (parts[0] in context) {
            fixture = context[parts[0]]
          }
          
          if (fixture && typeof fixture === 'object') {
            // Handle paths like "slot.data.start_time" - explicitly check for .data
            if (parts.length >= 3 && parts[1] === 'data') {
              if (fixture.data && typeof fixture.data === 'object') {
                const dataPath = parts.slice(2).join('.')
                value = getNestedValue(fixture.data, dataPath)
              }
            } else if (fixture.data && parts.length > 1) {
              // Try accessing nested path in data (for paths like "slot.data.start_time" without explicit .data)
              const dataPath = parts.slice(1).join('.')
              value = getNestedValue(fixture.data, dataPath)
            }
            // If still not found, try accessing directly on fixture
            if (value === undefined && parts.length > 1) {
              value = getNestedValue(fixture, parts.slice(1).join('.'))
            }
          }
        }
      }
      
      if (value !== undefined) {
        // If value is a fixture object with .id, return the id when path ends with .id
        if (path.endsWith('.id') && value && typeof value === 'object' && value.id) {
          return value.id
        }
        // Convert to string
        if (value && typeof value === 'object') {
          return JSON.stringify(value)
        }
        return String(value)
      }
      return match
    })
  } else if (Array.isArray(obj)) {
    return obj.map(item => resolveTemplateDeep(item, context))
  } else if (obj && typeof obj === 'object') {
    const resolved = {}
    for (const [key, value] of Object.entries(obj)) {
      // Recursively resolve all nested objects and arrays
      resolved[key] = resolveTemplateDeep(value, context)
    }
    return resolved
  }
  return obj
}

function getNestedValue(obj, path) {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (part.includes(' OR ')) {
      // Handle OR conditions
      const options = part.split(' OR ')
      for (const option of options) {
        const val = getNestedValue(current, option.trim())
        if (val !== undefined) return val
      }
      return undefined
    }
    // Handle array access like bookings[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch
      if (Array.isArray(current[arrayName])) {
        current = current[arrayName][parseInt(index, 10)]
        continue
      }
    }
    current = current[part]
  }
  return current
}

export async function runPlan(plan, config) {
  // Handle sequence plans
  if (plan.sequence && Array.isArray(plan.sequence)) {
    return await runSequence(plan, config)
  }

  // Single plan execution
  return await runSinglePlan(plan, config)
}

async function runSinglePlan(plan, config) {
  const kernel = new ExecutionKernel({
    ...config,
    seedStr: plan.seed,
    rng: mulberry32(hashSeedToU32(plan.seed))
  })

  const stopConditions = plan.stop_conditions || ['invariant_violation']
  const timeBudgetMs = plan.time_budget_seconds ? plan.time_budget_seconds * 1000 : null
  const startTime = Date.now()

  console.log(`[SimCity] Starting plan execution: ${plan.capabilityId} (seed: ${plan.seed}, iterations: ${plan.iterations})`)
  if (timeBudgetMs) {
    console.log(`[SimCity] Time budget: ${plan.time_budget_seconds}s`)
  }

  // Create fixtures
  const { fixtures, ids } = await createFixtures(plan, kernel, config)
  console.log(`[SimCity] Fixtures created: ${Object.keys(fixtures).join(', ')}`)

  // Wait for triggers to complete (especially for bookings)
  await new Promise(resolve => setTimeout(resolve, 200))

  // Build runtime context for template resolution
  const runtimeContext = buildRuntimeContext(plan, fixtures, ids, config)

  // Enforce fixture finalization: all fixtures must have .data before template resolution
  assertContextComplete(runtimeContext)

  // Resolve intent templates (ONLY after fixtures are fully materialized)
  const intents = resolveIntents(plan, fixtures, config, runtimeContext)

  // Resolve invariant queries (ONLY after fixtures are fully materialized)
  const invariants = resolveInvariants(plan, fixtures, config, ids, runtimeContext)

  // Validate initial state (context is already complete at this point)
  const initialState = await queryStateForInvariants(invariants, kernel, runtimeContext)
  const initialResults = await assertAllInvariants(invariants, initialState, kernel, 0, { type: 'initial' })
  for (const result of initialResults) {
    if (!result.pass) {
      console.error(`[SimCity] Initial state validation failed: ${result.message}`)
      const snapshot = kernel.snapshotState(initialState, {
        step: 0,
        action: { type: 'initial' },
        capabilityId: plan.capabilityId,
        seed: plan.seed
      })
      const snapshotPath = await kernel.saveSnapshot(snapshot, 'chaos/forensics')
      return {
        pass: false,
        step: 0,
        failure: result,
        snapshotPath
      }
    }
  }

  // Run chaos loop
  let lastAction = null
  let restartCount = 0
  let step = 1

  while (true) {
    // Check time budget
    if (timeBudgetMs && stopConditions.includes('time_budget_exhausted')) {
      const elapsed = Date.now() - startTime
      if (elapsed >= timeBudgetMs) {
        console.log(`[SimCity] Time budget exhausted: ${Math.round(elapsed / 1000)}s >= ${plan.time_budget_seconds}s`)
        const finalState = await queryStateForInvariants(invariants, kernel, runtimeContext)
        const terminalCheck = checkTerminalState(plan, finalState, fixtures, kernel)
        
        if (!terminalCheck.pass) {
          console.error(`[SimCity] FAIL: Invalid terminal state after time budget`)
          console.error(`[SimCity] ${terminalCheck.message}`)
          
          const snapshot = kernel.snapshotState(finalState, {
            step,
            action: lastAction,
            capabilityId: plan.capabilityId,
            seed: plan.seed,
            checkType: 'terminal'
          })
          const snapshotPath = await kernel.saveSnapshot(snapshot, 'chaos/forensics')
          
          return {
            pass: false,
            step,
            failure: terminalCheck,
            snapshotPath
          }
        }
        
        console.log(`[SimCity] PASS: Time budget exhausted (${Math.round(elapsed / 1000)}s)`)
        return {
          pass: true,
          iterations: step - 1,
          restartCount,
          elapsedSeconds: Math.round(elapsed / 1000)
        }
      }
    }

    // Check iteration limit
    if (step > plan.iterations) {
      break
    }
    // Choose action based on chaos profile
    const action = chooseAction(plan.chaosProfile, kernel.config.rng)
    lastAction = action

    // Execute action
    if (action.type === 'send_request' || action.type === 'retry_request') {
      // Map action intentId to actual intent key
      let intentKey = action.intentId
      if (intentKey === 'intentA') intentKey = 'intentA'
      else if (intentKey === 'intentB') intentKey = 'intentB'
      else if (intentKey === 'crossVendorAttempt') intentKey = 'crossVendorAttempt'
      else if (intentKey === 'cancel') intentKey = 'cancel'
      else if (intentKey === 'rebook') intentKey = 'rebook'
      else if (intentKey === 'bookSlot1') intentKey = 'bookSlot1'
      else if (intentKey === 'bookSlot2') intentKey = 'bookSlot2'
      else if (intentKey === 'bookVendorA') intentKey = 'bookVendorA'
      else if (intentKey === 'bookVendorB') intentKey = 'bookVendorB'
      else intentKey = 'reschedule' // Default for SC-4
      
      const intent = intents[intentKey] || intents[Object.keys(intents)[0]]
      if (intent) {
        // Resolve templates in endpoint and payload before sending
        const resolvedEndpoint = resolveTemplateDeep(intent.endpoint, runtimeContext)
        const resolvedPayload = resolveTemplateDeep(intent.payload, runtimeContext)
        await kernel.sendRequest(intent.intentId, resolvedEndpoint, resolvedPayload, {
          transport: intent.transport
        })
      }
    } else if (action.type === 'restart_process') {
      restartCount++
      await kernel.restartProcess()
    }
    // no_op does nothing

    // Small delay for async operations
    await new Promise(resolve => setTimeout(resolve, 10))

    // Query state and assert invariants (queries are resolved in queryStateForInvariants)
    const state = await queryStateForInvariants(invariants, kernel, runtimeContext)
    const assertionResults = await assertAllInvariants(invariants, state, kernel, step, action)

    // Check for failures
    for (const result of assertionResults) {
      if (!result.pass && stopConditions.includes('invariant_violation')) {
        console.error(`[SimCity] FAIL at step ${step} (action: ${action.type})`)
        console.error(`[SimCity] ${result.message}`)
        
        // Create forensic snapshot
        const snapshot = kernel.snapshotState(state, {
          step,
          action,
          capabilityId: plan.capabilityId,
          seed: plan.seed
        })
        const snapshotPath = await kernel.saveSnapshot(snapshot, 'chaos/forensics')
        
        console.error(`[SimCity] Forensic snapshot saved to: ${snapshotPath}`)
        return {
          pass: false,
          step,
          action,
          failure: result,
          snapshotPath
        }
      }
    }

    step++

    // Idempotency check (periodically and after retries)
    if (action.type === 'retry_request' || step % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
      const stateBefore = await queryStateForInvariants(invariants, kernel, runtimeContext)
      
      // Send retry again
      if (action.type === 'retry_request') {
        let intentKey = action.intentId
        if (intentKey === 'intentA') intentKey = 'intentA'
        else if (intentKey === 'intentB') intentKey = 'intentB'
        else if (intentKey === 'crossVendorAttempt') intentKey = 'crossVendorAttempt'
        else if (intentKey === 'cancel') intentKey = 'cancel'
        else if (intentKey === 'rebook') intentKey = 'rebook'
        else intentKey = 'reschedule'
        
        const intent = intents[intentKey] || intents[Object.keys(intents)[0]]
        if (intent) {
          const resolvedEndpoint = resolveTemplateDeep(intent.endpoint, runtimeContext)
          const resolvedPayload = resolveTemplateDeep(intent.payload, runtimeContext)
          await kernel.sendRequest(intent.intentId, resolvedEndpoint, resolvedPayload)
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200))
      const stateAfter = await queryStateForInvariants(invariants, kernel, runtimeContext)
      
      // Check idempotency
      const idempotencyResult = checkIdempotency(stateBefore, stateAfter, step, kernel)
      if (!idempotencyResult.pass) {
        console.error(`[SimCity] FAIL at step ${step} (idempotency check)`)
        console.error(`[SimCity] ${idempotencyResult.message}`)
        
        const snapshot = kernel.snapshotState({ before: stateBefore, after: stateAfter }, {
          step,
          action,
          capabilityId: plan.capabilityId,
          seed: plan.seed,
          checkType: 'idempotency'
        })
        const snapshotPath = await kernel.saveSnapshot(snapshot, 'chaos/forensics')
        
        return {
          pass: false,
          step,
          action,
          failure: idempotencyResult,
          snapshotPath
        }
      }
    }
  }

  // Final state check
  const finalState = await queryStateForInvariants(invariants, kernel, runtimeContext)
  const terminalCheck = checkTerminalState(plan, finalState, fixtures, kernel)
  
  if (!terminalCheck.pass) {
    console.error(`[SimCity] FAIL: Invalid terminal state`)
    console.error(`[SimCity] ${terminalCheck.message}`)
    
    const snapshot = kernel.snapshotState(finalState, {
      step,
      action: lastAction,
      capabilityId: plan.capabilityId,
      seed: plan.seed,
      checkType: 'terminal'
    })
    const snapshotPath = await kernel.saveSnapshot(snapshot, 'chaos/forensics')
    
    return {
      pass: false,
      step,
      failure: terminalCheck,
      snapshotPath
    }
  }

  const elapsed = timeBudgetMs ? Math.round((Date.now() - startTime) / 1000) : null
  console.log(`[SimCity] PASS: Completed ${step - 1} iterations`)
  console.log(`[SimCity] Restarts simulated: ${restartCount}`)
  if (elapsed) {
    console.log(`[SimCity] Elapsed time: ${elapsed}s`)
  }
  
  return {
    pass: true,
    iterations: step - 1,
    restartCount,
    elapsedSeconds: elapsed
  }
}

async function runSequence(plan, config) {
  const sequence = plan.sequence
  const maxSequenceLength = 5
  
  if (sequence.length > maxSequenceLength) {
    throw new Error(`Sequence length ${sequence.length} exceeds maximum ${maxSequenceLength}`)
  }

  const stopConditions = plan.stop_conditions || ['invariant_violation']
  const timeBudgetMs = plan.time_budget_seconds ? plan.time_budget_seconds * 1000 : null
  const startTime = Date.now()

  console.log(`[SimCity] Starting sequence execution: ${sequence.length} plans`)
  if (timeBudgetMs) {
    console.log(`[SimCity] Time budget: ${plan.time_budget_seconds}s`)
  }

  let sharedContext = {}
  let totalIterations = 0
  let totalRestarts = 0

  for (let i = 0; i < sequence.length; i++) {
    // Check time budget before each step
    if (timeBudgetMs && stopConditions.includes('time_budget_exhausted')) {
      const elapsed = Date.now() - startTime
      if (elapsed >= timeBudgetMs) {
        console.log(`[SimCity] Time budget exhausted at step ${i + 1}/${sequence.length}: ${Math.round(elapsed / 1000)}s >= ${plan.time_budget_seconds}s`)
        return {
          pass: true,
          steps: i,
          iterations: totalIterations,
          restartCount: totalRestarts,
          elapsedSeconds: Math.round(elapsed / 1000)
        }
      }
    }
    const stepPlan = sequence[i]
    console.log(`[SimCity] Step ${i + 1}/${sequence.length}: ${stepPlan.capability}`)

    // Build plan from sequence step
    const fullPlan = await buildPlanFromSequenceStep(stepPlan, plan.seed || `seq-${Date.now()}`, sharedContext)

    // Execute step
    const result = await runSinglePlan(fullPlan, config)

    if (!result.pass) {
      console.error(`[SimCity] Sequence FAILED at step ${i + 1}`)
      return {
        pass: false,
        step: i + 1,
        sequenceStep: stepPlan.capability,
        failure: result.failure,
        snapshotPath: result.snapshotPath
      }
    }

    totalIterations += result.iterations || 0
    totalRestarts += result.restartCount || 0

    // Optionally carry context forward (for now, we recreate fixtures each step)
    // sharedContext could be used to reuse fixtures if needed
  }

  const elapsed = timeBudgetMs ? Math.round((Date.now() - startTime) / 1000) : null
  console.log(`[SimCity] Sequence PASS: Completed ${sequence.length} steps`)
  if (elapsed) {
    console.log(`[SimCity] Elapsed time: ${elapsed}s`)
  }
  return {
    pass: true,
    steps: sequence.length,
    iterations: totalIterations,
    restartCount: totalRestarts,
    elapsedSeconds: elapsed
  }
}

async function buildPlanFromSequenceStep(stepPlan, seed, sharedContext) {
  // Load capability
  const { loadCapability } = await import('../capabilities/registry.mjs')
  const capability = await loadCapability(stepPlan.capability)

  // Map chaos profile if provided, otherwise use capability default
  const chaosProfile = stepPlan.chaos_profile 
    ? mapChaosProfileFromSequence(stepPlan.chaos_profile, stepPlan.capability)
    : capability.chaosProfile

  return {
    capabilityId: stepPlan.capability,
    seed: `${seed}-step-${Date.now()}`,
    iterations: stepPlan.iterations || stepPlan.chaos_profile?.iterations || 50,
    fixtureSpecs: capability.fixtureSpecs,
    intentSpecs: capability.intentSpecs,
    invariantSpecs: capability.invariantSpecs,
    chaosProfile
  }
}

function mapChaosProfileFromSequence(geminiProfile, capabilityId) {
  const { retry_rate = 0.3, restart_rate = 0.2, reorder_rate = 0.0 } = geminiProfile || {}
  
  if (capabilityId === 'double_booking_attack') {
    const sendRate = (1 - retry_rate - restart_rate - reorder_rate) / 2
    return {
      send_request_A: sendRate,
      send_request_B: sendRate,
      retry_request_A: retry_rate / 2,
      retry_request_B: retry_rate / 2,
      restart_process: restart_rate,
      no_op: reorder_rate
    }
  } else if (capabilityId === 'overlapping_slots_attack') {
    const sendRate = (1 - retry_rate - restart_rate - reorder_rate) / 2
    return {
      send_request_A: sendRate,
      send_request_B: sendRate,
      retry_request_A: retry_rate / 2,
      retry_request_B: retry_rate / 2,
      restart_process: restart_rate,
      no_op: reorder_rate
    }
  } else if (capabilityId === 'vendor_isolation') {
    const sendRate = (1 - retry_rate - restart_rate - reorder_rate) / 3
    return {
      send_request_A: sendRate,
      send_request_B: sendRate,
      send_request_C: sendRate,
      retry_request_A: retry_rate / 3,
      retry_request_B: retry_rate / 3,
      retry_request_C: retry_rate / 3,
      restart_process: restart_rate,
      no_op: reorder_rate
    }
  } else if (capabilityId === 'cancel_rebook_race') {
    const sendRate = (1 - retry_rate - restart_rate - reorder_rate) / 2
    return {
      send_request: sendRate,
      retry_request: retry_rate,
      restart_process: restart_rate,
      no_op: reorder_rate
    }
  } else {
    // Default for single-intent capabilities
    const sendRate = 1 - retry_rate - restart_rate - reorder_rate
    return {
      send_request: sendRate,
      retry_request: retry_rate,
      restart_process: restart_rate,
      no_op: reorder_rate
    }
  }
}

async function createFixtures(plan, kernel, config) {
  const fixtures = {}
  const seedStr = plan.seed
  const rng = kernel.config.rng

  // Generate stable IDs for all fixtures upfront
  const ids = {}
  for (const [key, spec] of Object.entries(plan.fixtureSpecs)) {
    ids[key] = stableUuid(`${key}-${seedStr}`)
    // Also create ID variables like serviceId, slotId, etc.
    if (key === 'service') ids.serviceId = ids.service
    if (key === 'slot') ids.slotId = ids.slot
    if (key === 'slotA') ids.slotAId = ids.slotA
    if (key === 'slotB') ids.slotBId = ids.slotB
    if (key === 'booking') ids.bookingId = ids.booking
  }

  // Generate time-based values
  const now = Date.now()
  const slotStart = new Date(now + 24 * 60 * 60 * 1000).toISOString()
  const slotEnd = new Date(new Date(slotStart).getTime() + 60 * 60 * 1000).toISOString()
  const slotBStart = new Date(now + 48 * 60 * 60 * 1000).toISOString()
  const slotBEnd = new Date(new Date(slotBStart).getTime() + 60 * 60 * 1000).toISOString()
  // For overlapping slots: slot2 starts 30 minutes before slot1 ends
  const slot2Start = new Date(new Date(slotStart).getTime() + 30 * 60 * 1000).toISOString()
  const slot2End = new Date(new Date(slot2Start).getTime() + 60 * 60 * 1000).toISOString()

  // Create fixtures in dependency order
  const created = new Set()
  const toCreate = Object.entries(plan.fixtureSpecs)
  
  while (toCreate.length > 0) {
    let progress = false
    for (let i = toCreate.length - 1; i >= 0; i--) {
      const [key, spec] = toCreate[i]
      
      // Check dependencies
      const depsMet = !spec.dependsOn || spec.dependsOn.every(dep => created.has(dep))
      if (!depsMet) continue

      // Generate ID if not provided
      if (!ids[key] && spec.idTemplate) {
        ids[key] = stableUuid(`${key}-${seedStr}`)
      } else if (!ids[key]) {
        ids[key] = stableUuid(`${key}-${seedStr}`)
      }

      // Build template context with fixtures and IDs
      const templateContext = {
        seed: seedStr,
        slotStart,
        slotEnd,
        slotAStart: slotStart,
        slotAEnd: slotEnd,
        slotBStart,
        slotBEnd,
        slot1Start: slotStart,
        slot1End: slotEnd,
        slot2Start,
        slot2End
      }
      
      // Add all IDs to context first
      for (const [k, v] of Object.entries(ids)) {
        templateContext[`${k}Id`] = v
      }
      
      // Add fixtures to context (can access .id, .data, etc.)
      for (const [k, fixture] of Object.entries(fixtures)) {
        templateContext[k] = fixture
        // Also add as kId for convenience (use fixture.id if available, otherwise use generated id)
        if (fixture && fixture.id) {
          templateContext[`${k}Id`] = fixture.id
        } else if (ids[k]) {
          templateContext[`${k}Id`] = ids[k]
        }
      }
      
      const resolved = resolveTemplate(spec.template, templateContext)
      
      // Ensure ID is set
      if (!resolved.id && ids[key]) {
        resolved.id = ids[key]
      }

      // Create fixture
      const fixture = await kernel.createFixture(spec.type, resolved)
      fixtures[key] = fixture
      created.add(key)
      toCreate.splice(i, 1)
      progress = true
    }

    if (!progress) {
      throw new Error(`Circular dependency or missing dependency in fixtures`)
    }
  }

  return { fixtures, ids }
}

function buildRuntimeContext(plan, fixtures, ids, config) {
  const seedStr = plan.seed
  const now = Date.now()
  const slotStart = new Date(now + 24 * 60 * 60 * 1000).toISOString()
  const slotEnd = new Date(new Date(slotStart).getTime() + 60 * 60 * 1000).toISOString()
  const slotBStart = new Date(now + 48 * 60 * 60 * 1000).toISOString()
  const slotBEnd = new Date(new Date(slotBStart).getTime() + 60 * 60 * 1000).toISOString()
  // For overlapping slots: slot2 starts 30 minutes before slot1 ends
  const slot2Start = new Date(new Date(slotStart).getTime() + 30 * 60 * 1000).toISOString()
  const slot2End = new Date(new Date(slot2Start).getTime() + 60 * 60 * 1000).toISOString()

  const context = {
    seed: seedStr,
    slotStart,
    slotEnd,
    slotAStart: slotStart,
    slotAEnd: slotEnd,
    slotBStart,
    slotBEnd,
    slot1Start: slotStart,
    slot1End: slotEnd,
    slot2Start,
    slot2End,
    intentAId: stableUuid(`intent-a-${seedStr}`),
    intentBId: stableUuid(`intent-b-${seedStr}`),
    intentId: stableUuid(`intent-${seedStr}`),
    cancelIntentId: stableUuid(`cancel-intent-${seedStr}`),
    rebookIntentId: stableUuid(`rebook-intent-${seedStr}`),
    intent1Id: stableUuid(`intent-1-${seedStr}`),
    intent2Id: stableUuid(`intent-2-${seedStr}`),
    crossIntentId: stableUuid(`cross-intent-${seedStr}`),
    bookingAId: stableUuid(`booking-a-${seedStr}`),
    bookingBId: stableUuid(`booking-b-${seedStr}`),
    initialBookingId: stableUuid(`initial-booking-${seedStr}`),
    rebookBookingId: stableUuid(`rebook-booking-${seedStr}`),
    booking1Id: stableUuid(`booking-1-${seedStr}`),
    booking2Id: stableUuid(`booking-2-${seedStr}`),
    crossBookingId: stableUuid(`cross-booking-${seedStr}`),
    fixtures: {} // Explicit fixtures container
  }

  // Add all IDs to context
  for (const [k, v] of Object.entries(ids || {})) {
    context[`${k}Id`] = v
  }

  // Add fixtures to context with full data (fixtures must have .data property)
  for (const [k, fixture] of Object.entries(fixtures)) {
    // Store in fixtures container
    context.fixtures[k] = fixture
    // Also store at top level for backward compatibility
    context[k] = fixture
    if (fixture && fixture.id) {
      context[`${k}Id`] = fixture.id
    } else if (ids && ids[k]) {
      context[`${k}Id`] = ids[k]
    }
  }

  return context
}

function assertContextComplete(context) {
  if (!context.fixtures) {
    throw new Error('Context missing fixtures container')
  }
  
  for (const [name, fixture] of Object.entries(context.fixtures)) {
    if (!fixture) {
      throw new Error(`Fixture ${name} is null/undefined in context`)
    }
    if (!fixture.data) {
      throw new Error(`Fixture ${name} missing .data in context. Fixture structure: ${JSON.stringify(Object.keys(fixture))}`)
    }
    if (typeof fixture.data !== 'object') {
      throw new Error(`Fixture ${name}.data is not an object: ${typeof fixture.data}`)
    }
  }
}

// Legacy resolveTemplate - kept for backward compatibility in fixture creation
function resolveTemplate(template, context) {
  return resolveTemplateDeep(template, context)
}

function resolveIntents(plan, fixtures, config, runtimeContext) {
  const intents = {}

  for (const [key, spec] of Object.entries(plan.intentSpecs)) {
    const resolvedIntentId = resolveTemplateDeep(spec.intentId, runtimeContext)
    const endpoint = resolveTemplateDeep(spec.endpoint, runtimeContext)
    const payload = resolveTemplateDeep(spec.payloadTemplate, runtimeContext)
    // Transport is optional - defaults to 'http' in kernel
    const transport = spec.transport || undefined

    intents[key] = {
      intentId: resolvedIntentId,
      endpoint,
      payload,
      transport
    }
  }

  return intents
}

function resolveInvariants(plan, fixtures, config, ids, runtimeContext) {
  const invariants = []

  for (const [invariantId, spec] of Object.entries(plan.invariantSpecs)) {
    // Deep clone query to avoid mutating original
    const queryClone = JSON.parse(JSON.stringify(spec.query))
    // Resolve query templates (including nested filters and multi queries)
    const query = resolveTemplateDeep(queryClone, runtimeContext)
    const expectation = resolveTemplateDeep(spec.expectation, runtimeContext)

    invariants.push({
      id: invariantId,
      type: spec.type,
      query,
      expectation
    })
  }

  return invariants
}

function chooseAction(chaosProfile, rng) {
  const roll = rng()
  let cumulative = 0

  for (const [action, rate] of Object.entries(chaosProfile)) {
    cumulative += rate
    if (roll < cumulative) {
      if (action === 'send_request_A') {
        return { type: 'send_request', intentId: 'intentA' }
      } else if (action === 'send_request_B') {
        return { type: 'send_request', intentId: 'intentB' }
      } else if (action === 'send_request_C') {
        return { type: 'send_request', intentId: 'crossVendorAttempt' }
      } else if (action === 'send_request') {
        // Single intent capabilities - map to first available intent
        return { type: 'send_request', intentId: 'cancel' } // Default, will be overridden by actual intent
      } else if (action === 'retry_request_A') {
        return { type: 'retry_request', intentId: 'intentA' }
      } else if (action === 'retry_request_B') {
        return { type: 'retry_request', intentId: 'intentB' }
      } else if (action === 'retry_request_C') {
        return { type: 'retry_request', intentId: 'crossVendorAttempt' }
      } else if (action === 'retry_request') {
        return { type: 'retry_request', intentId: 'cancel' } // Default
      } else if (action === 'restart_process') {
        return { type: 'restart_process' }
      } else if (action === 'no_op') {
        return { type: 'no_op' }
      }
    }
  }

  return { type: 'no_op' }
}

async function queryStateForInvariants(invariants, kernel, runtimeContext) {
  const state = {}
  
  for (const invariant of invariants) {
    // Query is already resolved in resolveInvariants, but resolve again in case context changed
    // Deep clone to avoid mutating the original
    const queryClone = JSON.parse(JSON.stringify(invariant.query))
    let resolvedQuery = resolveTemplateDeep(queryClone, runtimeContext)
    
    // For multi queries, ensure nested queries are also resolved
    if (resolvedQuery.type === 'multi' && resolvedQuery.queries) {
      for (const [key, nestedQuery] of Object.entries(resolvedQuery.queries)) {
        resolvedQuery.queries[key] = resolveTemplateDeep(nestedQuery, runtimeContext)
      }
    }
    
    // Debug: check if templates are still unresolved
    const queryStr = JSON.stringify(resolvedQuery)
    if (queryStr.includes('{{')) {
      console.warn(`[SimCity] Warning: Unresolved template in query for ${invariant.id}`)
      // Debug: show what's in context for slot
      if (queryStr.includes('slot') && runtimeContext) {
        const slot = runtimeContext.slot
        console.warn(`[SimCity] Context keys: ${Object.keys(runtimeContext).join(', ')}`)
        console.warn(`[SimCity] slot exists: ${!!slot}, slot type: ${typeof slot}, slot.data: ${!!slot?.data}, slot.data.start_time: ${slot?.data?.start_time}`)
        // Try to manually resolve
        if (slot && slot.data && slot.data.start_time) {
          console.warn(`[SimCity] Manual resolution would work: slot.data.start_time = ${slot.data.start_time}`)
        }
      }
    }
    
    const queryResult = await kernel.queryState(resolvedQuery)
    
    if (invariant.query.type === 'multi') {
      // Multi query returns object with multiple keys
      Object.assign(state, queryResult)
    } else if (invariant.query.type === 'bookings') {
      // Bookings query returns array
      if (!state.bookings) state.bookings = []
      if (Array.isArray(queryResult)) {
        state.bookings.push(...queryResult)
      } else if (queryResult) {
        state.bookings.push(queryResult)
      }
    } else if (invariant.query.type === 'slot') {
      // Store as both slot and in invariant key
      state.slot = queryResult
      state[invariant.id] = queryResult
    } else if (invariant.query.type === 'booking') {
      // Single booking - store as booking and in bookings array
      if (!state.bookings) state.bookings = []
      if (queryResult) {
        state.booking = queryResult
        state.bookings.push(queryResult)
        state[invariant.id] = queryResult
      }
    } else {
      state[invariant.id] = queryResult
    }
  }

  // Normalize state structure
  if (state.bookings && !Array.isArray(state.bookings)) {
    state.bookings = [state.bookings].filter(Boolean)
  }
  // Deduplicate bookings by ID
  if (Array.isArray(state.bookings)) {
    const seen = new Set()
    state.bookings = state.bookings.filter(b => {
      if (!b || !b.id) return false
      if (seen.has(b.id)) return false
      seen.add(b.id)
      return true
    })
  }
  if (state.slot && !state.slots) {
    state.slots = [state.slot].filter(Boolean)
  }
  if (state.slotA && state.slotB) {
    state.slots = [state.slotA, state.slotB].filter(Boolean)
    if (!state.slot) state.slot = state.slotA // For backward compatibility
  }

  return state
}

async function assertAllInvariants(invariants, state, kernel, step, action) {
  const results = []

  for (const invariant of invariants) {
    // Extract relevant state for this invariant
    let invariantState = state
    
    if (invariant.query.type === 'multi') {
      invariantState = state
    } else if (invariant.query.type === 'bookings') {
      invariantState = { bookings: Array.isArray(state.bookings) ? state.bookings : (state.bookings ? [state.bookings] : []) }
    } else if (invariant.query.type === 'slot') {
      invariantState = { slot: state[invariant.id] || state.slot || state.slotA || state.slotB }
    } else if (invariant.query.type === 'booking') {
      // Single booking query - wrap in array for consistency
      const booking = state[invariant.id] || state.booking
      invariantState = { bookings: booking ? [booking] : [] }
    } else {
      invariantState = { [invariant.id]: state[invariant.id] }
    }

    const result = kernel.assertInvariant(invariant.id, invariantState, invariant.expectation)
    results.push({
      invariantId: invariant.id,
      ...result
    })
  }

  return results
}

function checkIdempotency(stateBefore, stateAfter, step, kernel) {
  // Compare key fields
  const fields = ['bookings', 'slot', 'slotA', 'slotB', 'slots']
  
  for (const field of fields) {
    const before = stateBefore[field]
    const after = stateAfter[field]
    
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      return {
        pass: false,
        message: `Idempotency violation: ${field} changed`
      }
    }
  }

  return { pass: true }
}

function checkTerminalState(plan, state, fixtures, kernel) {
  // Basic terminal state check - can be enhanced per capability
  if (plan.capabilityId === 'double_booking_attack') {
    const bookings = Array.isArray(state.bookings) ? state.bookings : []
    if (bookings.length > 1) {
      return {
        pass: false,
        message: `Invalid terminal state: Multiple bookings (${bookings.length})`
      }
    }
  }

  return { pass: true }
}


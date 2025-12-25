import { loadCapability, listCapabilities } from '../capabilities/registry.mjs'
import { stableUuid, mulberry32, hashSeedToU32 } from '../kernel/utils.mjs'

export async function getPlan(naturalLanguageIntent, context = {}) {
  const intent = naturalLanguageIntent.toLowerCase()
  
  // Extract iterations from intent
  const iterationsMatch = intent.match(/(\d+)\s*(?:iterations?|steps?|times?)/)
  const iterations = iterationsMatch ? parseInt(iterationsMatch[1], 10) : (context.iterations || 50)
  
  // Extract seed from context or generate from intent + timestamp
  const seed = context.seed || `${intent.replace(/[^a-z0-9]/g, '').slice(0, 15)}-${Date.now().toString(36)}` || `default-${Date.now()}`
  
  // Determine capability
  let capabilityId = null
  
  if (intent.includes('double book') || intent.includes('sc-1') || intent.includes('double-booking')) {
    capabilityId = 'double_booking_attack'
  } else if (intent.includes('reschedule') || intent.includes('sc-4') || intent.includes('atomicity')) {
    capabilityId = 'reschedule_atomicity'
  } else if (intent.includes('cancel') && intent.includes('rebook') || intent.includes('cancel-rebook')) {
    capabilityId = 'cancel_rebook_race'
  } else if (intent.includes('overlapping') || intent.includes('temporal') || intent.includes('time-window')) {
    capabilityId = 'overlapping_slots_attack'
  } else if (intent.includes('vendor isolation') || intent.includes('tenant') || intent.includes('cross-vendor') || intent.includes('isolation')) {
    capabilityId = 'vendor_isolation'
  } else if (intent.includes('all scheduling') || intent.includes('run all') || intent.includes('sequence')) {
    // Handle sequence requests
    const allCapabilities = await listCapabilities()
    const schedulingCapabilities = ['double_booking_attack', 'overlapping_slots_attack', 'cancel_rebook_race']
      .filter(id => allCapabilities.some(c => c.id === id))
      .map(id => allCapabilities.find(c => c.id === id))
    
    // Extract time duration from intent
    let timeBudgetSeconds = null
    const timeMatch = intent.match(/(\d+)\s*(?:minute|min|m|hour|hr|h)/i)
    if (timeMatch) {
      const value = parseInt(timeMatch[1], 10)
      const timeStr = intent.substring(timeMatch.index).toLowerCase()
      if (timeStr.includes('hour') || timeStr.includes('hr') || (timeStr.includes('h') && !timeStr.includes('min'))) {
        timeBudgetSeconds = value * 3600
      } else {
        timeBudgetSeconds = value * 60
      }
    }
    
    // Escalate chaos rates if requested
    const isEscalated = intent.includes('escalate') || intent.includes('aggressive') || intent.includes('soak')
    const retryRate = isEscalated ? 0.5 : 0.4
    const restartRate = isEscalated ? 0.3 : 0.2
    
    const stopConditions = ['invariant_violation']
    if (timeBudgetSeconds) {
      stopConditions.push('time_budget_exhausted')
    }
    
    if (schedulingCapabilities.length > 0) {
      return {
        sequence: schedulingCapabilities.map(cap => ({
          capability: cap.id,
          iterations: iterations,
          chaos_profile: {
            iterations: iterations,
            retry_rate: retryRate,
            restart_rate: restartRate,
            reorder_rate: 0.0
          }
        })),
        seed: seed,
        stop_conditions: stopConditions,
        time_budget_seconds: timeBudgetSeconds,
        confidence: 'medium',
        confidence_rationale: 'Sequence of scheduling capabilities inferred from intent'
      }
    }
  }
  
  if (!capabilityId) {
    return {
      error: 'UNSUPPORTED_INTENT',
      message: `Cannot understand intent: "${naturalLanguageIntent}". Supported: double booking (SC-1), reschedule atomicity (SC-4), cancel-rebook race, overlapping slots, vendor isolation, or "run all scheduling attacks"`,
      supportedIntents: [
        'double booking attack',
        'SC-1',
        'reschedule atomicity',
        'SC-4',
        'cancel rebook race',
        'overlapping slots',
        'vendor isolation',
        'run all scheduling attacks'
      ]
    }
  }

  // Load capability
  const capability = await loadCapability(capabilityId)
  
  // Build plan
  const plan = {
    capabilityId,
    seed,
    iterations,
    fixtureSpecs: capability.fixtureSpecs,
    intentSpecs: capability.intentSpecs,
    invariantSpecs: capability.invariantSpecs,
    chaosProfile: capability.chaosProfile,
    confidence: 'high',
    confidence_rationale: `Direct match to ${capabilityId} capability`
  }

  return plan
}


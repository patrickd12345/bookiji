#!/usr/bin/env node

/**
 * SimCity CLI - Natural language chaos testing interface
 * 
 * Usage:
 *   node chaos/simcity/cli.mjs "Run all scheduling attacks in sequence for 30 minutes. Escalate retries and restarts. Stop on invariant violation."
 */

import { getPlan } from './planner.mjs'
import { executePlan } from './runner.mjs'

async function main() {
  const naturalLanguageCommand = process.argv.slice(2).join(' ').trim()
  
  if (!naturalLanguageCommand) {
    console.error('Usage: node chaos/simcity/cli.mjs "<natural language command>"')
    console.error('')
    console.error('Example:')
    console.error('  node chaos/simcity/cli.mjs "Run all scheduling attacks in sequence for 30 minutes. Escalate retries and restarts. Stop on invariant violation."')
    process.exit(1)
  }

  const plannerMode = process.env.SIMCITY_PLANNER || 'stub'
  
  if (plannerMode === 'llm' && !process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is required when SIMCITY_PLANNER=llm')
    process.exit(1)
  }

  try {
    console.log('📋 Planning test execution...')
    const plan = await getPlan(naturalLanguageCommand, {
      plannerMode,
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiModel: process.env.SIMCITY_PLANNER_MODEL || 'gemini-1.5-flash'
    })

    console.log(`✅ Plan generated: ${plan.capabilityIds.length} capabilities, ${plan.durationMinutes} minutes`)
    console.log(`   Chaos rates: retry=${plan.chaos.retryRate}, restart=${plan.chaos.restartRate}`)
    console.log('')

    console.log('🚀 Executing plan...')
    const result = await executePlan(plan)

    if (result.success) {
      console.log('')
      console.log('✅ PASS: All invariants held')
      console.log(`   Duration: ${result.durationSeconds}s`)
      console.log(`   Events: ${result.eventsExecuted}`)
      process.exit(0)
    } else {
      console.log('')
      console.log('❌ FAIL: Invariant violation detected')
      console.log(`   Invariant: ${result.failedInvariant}`)
      console.log(`   Event index: ${result.failedEventIndex}`)
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      if (result.forensic) {
        console.log(`   Forensic: ${JSON.stringify(result.forensic, null, 2)}`)
      }
      process.exit(1)
    }
  } catch (error) {
    console.error('')
    console.error('❌ Error:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()

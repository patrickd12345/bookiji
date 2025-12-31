#!/usr/bin/env node

import { runPlan } from '../runner/index.mjs'

// Get config from environment
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = (process.env.SUPABASE_SECRET_KEY || 
  process.env.SUPABASE_SECRET_KEY || 
  process.env.SUPABASE_SERVICE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU').replace(/^Bearer\s+/i, '').trim()

const targetUrl = process.env.TARGET_URL || 'http://localhost:3000'

// Get intent from command line
const intent = process.argv.slice(2).join(' ')

if (!intent) {
  console.error('Usage: node chaos/simcity/cli.mjs "<natural language intent>"')
  console.error('')
  console.error('Examples:')
  console.error('  node chaos/simcity/cli.mjs "SC-4 reschedule atomicity 50 iterations"')
  console.error('  node chaos/simcity/cli.mjs "Double book the same slot with two customers; be aggressive; 50 iterations"')
  console.error('  node chaos/simcity/cli.mjs "Run all scheduling attacks in sequence for 30 minutes. Escalate retries and restarts. Stop on invariant violation."')
  console.error('')
  console.error('Environment variables:')
  console.error('  SIMCITY_PLANNER=llm          Use LLM planner (default: stub)')
  console.error('  GEMINI_API_KEY=...           Required for LLM planner')
  console.error('  SIMCITY_PLANNER_MODEL=...    Model name (default: gemini-1.5-flash)')
  process.exit(1)
}

async function main() {
  try {
    // Select planner based on environment
    const plannerMode = process.env.SIMCITY_PLANNER || 'stub'
    const planner = plannerMode === 'llm'
      ? await import('../planner/llm.mjs')
      : await import('../planner/stub.mjs')

    // Get plan from planner
    const planResult = await planner.getPlan(intent, {
      targetUrl,
      supabaseUrl,
      supabaseServiceKey,
      naturalLanguageIntent: intent
    })

    if (planResult.error) {
      console.error(`[SimCity] ${planResult.error}: ${planResult.message}`)
      if (planResult.supportedIntents) {
        console.error(`[SimCity] Supported intents: ${planResult.supportedIntents.join(', ')}`)
      }
      process.exit(1)
    }

    // Log confidence if present
    if (planResult.confidence) {
      const confidenceUpper = planResult.confidence.toUpperCase()
      console.log(`[SimCity] Planner confidence: ${confidenceUpper}`)
      if (planResult.confidence_rationale) {
        console.log(`[SimCity] Rationale: ${planResult.confidence_rationale}`)
      }
    }
    
    // Log plan details
    if (planResult.sequence) {
      console.log(`[SimCity] Plan: ${planResult.sequence.length}-step sequence`)
      planResult.sequence.forEach((step, i) => {
        console.log(`[SimCity]   Step ${i + 1}: ${step.capability} (${step.iterations || step.chaos_profile?.iterations || 50} iterations)`)
      })
    } else {
      console.log(`[SimCity] Plan: ${planResult.capabilityId} (${planResult.iterations} iterations)`)
    }
    if (planResult.time_budget_seconds) {
      console.log(`[SimCity] Time budget: ${planResult.time_budget_seconds}s (${Math.round(planResult.time_budget_seconds / 60)} minutes)`)
    }
    if (planResult.stop_conditions) {
      console.log(`[SimCity] Stop conditions: ${planResult.stop_conditions.join(', ')}`)
    }

    // Run plan
    const result = await runPlan(planResult, {
      supabaseUrl,
      supabaseServiceKey,
      targetUrl
    })

    // Print results
    if (result.pass) {
      console.log(`[SimCity] ✅ PASS`)
      console.log(`[SimCity] Completed ${result.iterations || result.steps || 0} ${result.steps ? 'steps' : 'iterations'}`)
      if (result.restartCount !== undefined) {
        console.log(`[SimCity] Restarts simulated: ${result.restartCount}`)
      }
      if (result.elapsedSeconds !== undefined) {
        console.log(`[SimCity] Elapsed time: ${result.elapsedSeconds}s`)
      }
      printOutcomeSummary(result)
      process.exit(0)
    } else {
      console.error(`[SimCity] ❌ FAIL`)
      console.error(`[SimCity] Failed at step ${result.step}`)
      if (result.action) {
        console.error(`[SimCity] Action: ${JSON.stringify(result.action)}`)
      }
      if (result.failure) {
        console.error(`[SimCity] Failure: ${result.failure.message}`)
      }
      if (result.snapshotPath) {
        console.error(`[SimCity] Forensic snapshot: ${result.snapshotPath}`)
      }
      printOutcomeSummary(result)
      process.exit(1)
    }
  } catch (err) {
    console.error(`[SimCity] FATAL ERROR:`, err)
    process.exit(1)
  }
}

main()

function printOutcomeSummary(result) {
  if (!result) return
  const status = result.status || (result.pass ? 'SUCCESS' : 'FAILURE')
  console.log(`[SimCity] Final status: ${status}`)

  if (Array.isArray(result.proofs) && result.proofs.length > 0) {
    console.log(`[SimCity] Proofs (${result.proofs.length}):`)
    result.proofs.forEach((proof, index) => {
      console.log(`  ${index + 1}. ${proof.invariantId}: ${proof.detail}`)
    })
  } else {
    console.log('[SimCity] Proofs: <none>')
  }

  if (Array.isArray(result.violations) && result.violations.length > 0) {
    console.log(`[SimCity] Violations (${result.violations.length}):`)
    result.violations.forEach((violation, index) => {
      console.log(`  ${index + 1}. ${violation.invariantId || '<unknown>'} (${violation.type}): ${violation.detail}`)
    })
  } else {
    console.log('[SimCity] Violations: <none>')
  }
}


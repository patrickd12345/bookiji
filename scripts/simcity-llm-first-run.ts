#!/usr/bin/env tsx
/**
 * SimCity LLM First Run - Truth Verification Test
 *
 * This script performs a controlled SimCity run using LLM-driven event source.
 * Focus: Truth verification, not stress.
 */

import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '../src/config/supabase'

const RUN_DURATION_MS = 10 * 60 * 1000 // 10 minutes
const RUN_ID = 'simcity-llm-first-run'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface RunConfig {
  llmEvents: {
    enabled: boolean
    maxEventsPerTick: number
    probability: number
    runId: string
  }
  seed?: number
  tickRateMs?: number
}

async function startSimCityRun(config: RunConfig) {
  const response = await fetch(`${APP_URL}/api/ops/controlplane/simcity/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      seed: config.seed ?? 1,
      tickRateMs: config.tickRateMs ?? 1000,
      llmEvents: config.llmEvents,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to start SimCity: ${response.status} ${error}`)
  }

  return await response.json()
}

async function getSimCityStatus() {
  const response = await fetch(`${APP_URL}/api/ops/controlplane/simcity/status`)
  if (!response.ok) {
    throw new Error(`Failed to get status: ${response.status}`)
  }
  return await response.json()
}

async function stopSimCityRun() {
  const response = await fetch(`${APP_URL}/api/ops/controlplane/simcity/stop`, {
    method: 'POST',
  })
  if (!response.ok) {
    console.warn(`Failed to stop SimCity: ${response.status}`)
  }
}

async function getRunEvents() {
  const config = getSupabaseConfig()
  const supabase = createClient(config.url, config.secretKey || config.publishableKey)

  const { data, error } = await supabase
    .from('simcity_run_events')
    .select('*')
    .eq('run_id', RUN_ID)
    .order('event_index', { ascending: true })

  if (error) {
    console.error('Failed to fetch run events:', error)
    return []
  }

  return data || []
}

async function getRunSnapshots() {
  const config = getSupabaseConfig()
  const supabase = createClient(config.url, config.secretKey || config.publishableKey)

  const { data, error } = await supabase
    .from('simcity_run_snapshots')
    .select('*')
    .eq('run_id', RUN_ID)
    .order('event_index', { ascending: true })

  if (error) {
    console.error('Failed to fetch run snapshots:', error)
    return []
  }

  return data || []
}

function analyzeEvents(events: any[]) {
  let feasible = 0
  let expectedRejection = 0
  let invalid = 0
  let invariantViolations = 0
  let silentFailures = 0

  for (const event of events) {
    const payload = event.event_payload as any
    if (!payload) continue

    const classification = payload.classification
    const executionResult = payload.execution_result
    const invariantCheck = payload.invariant_check

    if (classification === 'FEASIBLE') feasible++
    else if (classification === 'EXPECTED_REJECTION') expectedRejection++
    else if (classification === 'INVALID') invalid++

    if (invariantCheck?.status === 'violated') {
      invariantViolations++
    }

    // Silent failure: success=true but invariant violated
    if (executionResult?.success === true && invariantCheck?.status === 'violated') {
      silentFailures++
    }
  }

  return {
    total: events.length,
    feasible,
    expectedRejection,
    invalid,
    invariantViolations,
    silentFailures,
  }
}

function analyzeSnapshots(snapshots: any[]) {
  if (snapshots.length === 0) {
    return {
      totalSnapshots: 0,
      metrics: {},
    }
  }

  const lastSnapshot = snapshots[snapshots.length - 1]
  const metrics = lastSnapshot.metrics || {}

  return {
    totalSnapshots: snapshots.length,
    metrics,
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('SimCity LLM First Run - Truth Verification Test')
  console.log('='.repeat(80))
  console.log(`Run ID: ${RUN_ID}`)
  console.log(`Duration: ${RUN_DURATION_MS / 1000} seconds`)
  console.log(`App URL: ${APP_URL}`)
  console.log('')

  // Check environment variables
  const llmEnabled = process.env.SIMCITY_LLM_ENABLED === 'true'
  const llmEndpoint = process.env.SIMCITY_LLM_ENDPOINT || 'http://localhost:11434/api/generate'
  const llmModel = process.env.SIMCITY_LLM_MODEL || 'llama3.2'

  console.log('Configuration:')
  console.log(`  SIMCITY_LLM_ENABLED: ${llmEnabled}`)
  console.log(`  SIMCITY_LLM_ENDPOINT: ${llmEndpoint}`)
  console.log(`  SIMCITY_LLM_MODEL: ${llmModel}`)
  console.log('')

  // Start the run
  console.log('Starting SimCity run...')
  const config: RunConfig = {
    llmEvents: {
      enabled: true,
      maxEventsPerTick: 1,
      probability: 0.25,
      runId: RUN_ID,
    },
    seed: 1,
    tickRateMs: 1000, // 1 second per tick
  }

  try {
    const startStatus = await startSimCityRun(config)
    console.log('Run started:', JSON.stringify(startStatus, null, 2))
    console.log('')

    // Monitor for RUN_DURATION_MS
    const startTime = Date.now()
    let lastTick = 0
    let invariantViolated = false

    console.log('Monitoring run...')
    console.log('Press Ctrl+C to stop early')
    console.log('')

    const monitorInterval = setInterval(async () => {
      try {
        const status = await getSimCityStatus()
        const currentTick = status.tick || 0

        if (currentTick !== lastTick) {
          console.log(`[${new Date().toISOString()}] Tick: ${currentTick}, Running: ${status.running}`)
          lastTick = currentTick

          // Check for invariant violations
          if (status.events) {
            const violationEvents = status.events.filter(
              (e: any) => e.event.type === 'invariant.violated' || e.event.type === 'engine.invariant.violated'
            )
            if (violationEvents.length > 0 && !invariantViolated) {
              invariantViolated = true
              console.error('⚠️  INVARIANT VIOLATION DETECTED!')
              console.error(JSON.stringify(violationEvents[violationEvents.length - 1], null, 2))
            }
          }
        }

        // Check stopping conditions
        const elapsed = Date.now() - startTime
        if (elapsed >= RUN_DURATION_MS) {
          clearInterval(monitorInterval)
          console.log('')
          console.log('Run duration reached. Stopping...')
          await stopSimCityRun()
          await generateReport()
          process.exit(0)
        }

        if (invariantViolated) {
          clearInterval(monitorInterval)
          console.log('')
          console.log('Invariant violation detected. Stopping...')
          await stopSimCityRun()
          await generateReport()
          process.exit(1)
        }
      } catch (error) {
        console.error('Error monitoring:', error)
      }
    }, 2000) // Check every 2 seconds

    // Handle Ctrl+C
    process.on('SIGINT', async () => {
      console.log('')
      console.log('Interrupted. Stopping...')
      clearInterval(monitorInterval)
      await stopSimCityRun()
      await generateReport()
      process.exit(0)
    })
  } catch (error) {
    console.error('Failed to start run:', error)
    process.exit(1)
  }
}

async function generateReport() {
  console.log('')
  console.log('='.repeat(80))
  console.log('Generating Report...')
  console.log('='.repeat(80))
  console.log('')

  const events = await getRunEvents()
  const snapshots = await getRunSnapshots()
  const eventAnalysis = analyzeEvents(events)
  const snapshotAnalysis = analyzeSnapshots(snapshots)

  console.log('Run Status:', eventAnalysis.invariantViolations > 0 ? 'FAILED' : 'SUCCESS')
  console.log('')
  console.log('Event Analysis:')
  console.log(`  Total events proposed: ${eventAnalysis.total}`)
  console.log(`  Feasible: ${eventAnalysis.feasible}`)
  console.log(`  Expected Rejection: ${eventAnalysis.expectedRejection}`)
  console.log(`  Invalid: ${eventAnalysis.invalid}`)
  console.log(`  Invariant Violations: ${eventAnalysis.invariantViolations}`)
  console.log(`  Silent Failures: ${eventAnalysis.silentFailures}`)
  console.log('')

  console.log('Snapshot Analysis:')
  console.log(`  Total snapshots: ${snapshotAnalysis.totalSnapshots}`)
  if (snapshotAnalysis.metrics && Object.keys(snapshotAnalysis.metrics).length > 0) {
    console.log('  Latest metrics:')
    for (const [key, value] of Object.entries(snapshotAnalysis.metrics)) {
      console.log(`    ${key}: ${value}`)
    }
  }
  console.log('')

  // Check critical invariants
  if (eventAnalysis.silentFailures > 0) {
    console.error('❌ CRITICAL: Silent failures detected!')
  } else {
    console.log('✅ Silent failure rate: 0 (as expected)')
  }

  if (eventAnalysis.invariantViolations > 0) {
    console.error('❌ CRITICAL: Invariant violations detected!')
  } else {
    console.log('✅ Invariant violation rate: 0 (as expected)')
  }

  console.log('')

  // Sample events
  if (events.length > 0) {
    console.log('Sample Events (first 3):')
    for (const event of events.slice(0, 3)) {
      const payload = event.event_payload as any
      console.log(`  Event ${event.event_index}:`)
      console.log(`    Type: ${event.event_type}`)
      console.log(`    Classification: ${payload?.classification}`)
      console.log(`    Execution Success: ${payload?.execution_result?.success}`)
      console.log(`    Invariant Status: ${payload?.invariant_check?.status}`)
      if (payload?.invariant_check?.violations?.length > 0) {
        console.log(`    Violations: ${JSON.stringify(payload.invariant_check.violations)}`)
      }
    }
  }

  console.log('')
  console.log('='.repeat(80))
  console.log('Report Complete')
  console.log('='.repeat(80))
}

// Run main if this is the main module
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

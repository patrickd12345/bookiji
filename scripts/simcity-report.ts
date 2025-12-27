#!/usr/bin/env tsx
/**
 * Generate report from SimCity LLM run
 */

import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '../src/config/supabase'

const RUN_ID = 'simcity-llm-first-run'

async function main() {
  const config = getSupabaseConfig()
  const supabase = createClient(config.url, config.secretKey || config.publishableKey)

  const { data: events } = await supabase
    .from('simcity_run_events')
    .select('*')
    .eq('run_id', RUN_ID)
    .order('event_index', { ascending: true })

  const { data: snapshots } = await supabase
    .from('simcity_run_snapshots')
    .select('*')
    .eq('run_id', RUN_ID)
    .order('event_index', { ascending: true })

  console.log('='.repeat(80))
  console.log('SimCity LLM First Run - Report')
  console.log('='.repeat(80))
  console.log(`Run ID: ${RUN_ID}`)
  console.log('')

  console.log('Events:', events?.length || 0)
  console.log('Snapshots:', snapshots?.length || 0)
  console.log('')

  if (events && events.length > 0) {
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

      if (executionResult?.success === true && invariantCheck?.status === 'violated') {
        silentFailures++
      }
    }

    console.log('Event Analysis:')
    console.log(`  Total events proposed: ${events.length}`)
    console.log(`  Feasible: ${feasible}`)
    console.log(`  Expected Rejection: ${expectedRejection}`)
    console.log(`  Invalid: ${invalid}`)
    console.log(`  Invariant Violations: ${invariantViolations}`)
    console.log(`  Silent Failures: ${silentFailures}`)
    console.log('')

    const runStatus = invariantViolations > 0 || silentFailures > 0 ? 'FAILED' : 'SUCCESS'
    console.log('Run Status:', runStatus)
    console.log('')

    if (silentFailures > 0) {
      console.error('❌ CRITICAL: Silent failures detected!')
    } else {
      console.log('✅ Silent failure rate: 0 (as expected)')
    }

    if (invariantViolations > 0) {
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
  } else {
    console.log('No events recorded. This may indicate:')
    console.log('  1. LLM endpoint was not available (events fail-closed)')
    console.log('  2. No events were generated during the run')
    console.log('  3. Events were not recorded (check database connection)')
  }

  console.log('')
  console.log('='.repeat(80))
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

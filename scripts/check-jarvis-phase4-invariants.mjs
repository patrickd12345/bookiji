#!/usr/bin/env node
/**
 * Jarvis Phase 4 Observability Invariants Check
 * 
 * CI-enforced checks for observability completeness:
 * 1. All escalation_decision_made events must have trace
 * 2. All traces must have required fields
 * 3. No orphan notification events (must link to decision)
 * 4. Resolved incidents must have terminal state
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const errors = []
const warnings = []

function fail(message) {
  console.error(`❌ PHASE-4 INVARIANT: ${message}`)
  errors.push(message)
}

function ok(message) {
  console.log(`✅ PHASE-4 INVARIANT: ${message}`)
}

// Get Supabase credentials from env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY)')
  console.error('Skipping Phase 4 invariant checks (requires database access)')
  process.exit(0) // Don't fail CI if credentials not available
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Check 1: All escalation_decision_made events must have trace
 */
async function checkMissingTraces() {
  try {
    const { data: events, error } = await supabase
      .from('jarvis_incident_events')
      .select('id, incident_id, occurred_at, trace')
      .eq('event_type', 'escalation_decision_made')

    if (error) {
      // If table doesn't exist yet, that's OK (migration not applied)
      if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        ok('jarvis_incident_events table not found (migration may not be applied yet)')
        return
      }
      fail(`Error querying escalation_decision_made events: ${error.message}`)
      return
    }

    if (!events || events.length === 0) {
      ok('No escalation_decision_made events found (no incidents processed yet)')
      return
    }

    const missingTraces = events.filter(e => !e.trace || Object.keys(e.trace || {}).length === 0)

    if (missingTraces.length > 0) {
      fail(
        `Found ${missingTraces.length} escalation_decision_made events without trace. ` +
        `Example: incident_id=${missingTraces[0].incident_id}, occurred_at=${missingTraces[0].occurred_at}`
      )
      return
    }

    ok(`All ${events.length} escalation_decision_made events have trace`)
  } catch (error) {
    fail(`Exception checking missing traces: ${error.message}`)
  }
}

/**
 * Check 2: All traces must have required fields
 */
async function checkIncompleteTraces() {
  try {
    const { data: events, error } = await supabase
      .from('jarvis_incident_events')
      .select('id, incident_id, occurred_at, trace')
      .eq('event_type', 'escalation_decision_made')
      .not('trace', 'is', null)

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        ok('jarvis_incident_events table not found (migration may not be applied yet)')
        return
      }
      fail(`Error querying traces: ${error.message}`)
      return
    }

    if (!events || events.length === 0) {
      ok('No escalation_decision_made events with traces found')
      return
    }

    const requiredFields = ['severity', 'quiet_hours', 'notifications_sent', 'cap', 'rule_fired']
    const incompleteTraces = []

    for (const event of events) {
      const trace = event.trace || {}
      const missingFields = requiredFields.filter(field => trace[field] === undefined || trace[field] === null)

      if (missingFields.length > 0) {
        incompleteTraces.push({
          incident_id: event.incident_id,
          occurred_at: event.occurred_at,
          missing_fields: missingFields
        })
      }
    }

    if (incompleteTraces.length > 0) {
      const example = incompleteTraces[0]
      fail(
        `Found ${incompleteTraces.length} traces with missing required fields. ` +
        `Example: incident_id=${example.incident_id}, missing: ${example.missing_fields.join(', ')}`
      )
      return
    }

    ok(`All ${events.length} traces have required fields (severity, quiet_hours, notifications_sent, cap, rule_fired)`)
  } catch (error) {
    fail(`Exception checking incomplete traces: ${error.message}`)
  }
}

/**
 * Check 3: No orphan notification events (must have parent decision in same incident)
 * 
 * Linkage rule: Each notification_sent or notification_suppressed event must have
 * a corresponding escalation_decision_made event in the same incident that occurred
 * at or before the notification event. This uses temporal ordering (nearest prior decision)
 * rather than explicit FK, which is acceptable for event sourcing patterns but requires
 * careful ordering guarantees.
 */
async function checkOrphanNotifications() {
  try {
    // Get all notification events
    const { data: notificationEvents, error: notifError } = await supabase
      .from('jarvis_incident_events')
      .select('id, incident_id, occurred_at, event_type')
      .in('event_type', ['notification_sent', 'notification_suppressed'])

    if (notifError) {
      if (notifError.code === 'PGRST204' || notifError.message?.includes('does not exist')) {
        ok('jarvis_incident_events table not found (migration may not be applied yet)')
        return
      }
      fail(`Error querying notification events: ${notifError.message}`)
      return
    }

    if (!notificationEvents || notificationEvents.length === 0) {
      ok('No notification events found')
      return
    }

    // For each notification event, check if there's a decision event in the same incident
    // that occurred before or at the same time (temporal linkage)
    const orphanEvents = []

    for (const notifEvent of notificationEvents) {
      const { data: decisionEvents, error: decisionError } = await supabase
        .from('jarvis_incident_events')
        .select('id, occurred_at')
        .eq('incident_id', notifEvent.incident_id)
        .eq('event_type', 'escalation_decision_made')
        .lte('occurred_at', notifEvent.occurred_at)
        .order('occurred_at', { ascending: false })
        .limit(1)

      if (decisionError) {
        fail(`Error checking parent decision for notification event ${notifEvent.id}: ${decisionError.message}`)
        continue
      }

      if (!decisionEvents || decisionEvents.length === 0) {
        orphanEvents.push(notifEvent)
      }
    }

    if (orphanEvents.length > 0) {
      const example = orphanEvents[0]
      fail(
        `Found ${orphanEvents.length} orphan notification events without parent decision. ` +
        `Linkage rule: notification events must have a prior escalation_decision_made event in the same incident. ` +
        `Example: incident_id=${example.incident_id}, event_type=${example.event_type}, occurred_at=${example.occurred_at}`
      )
      return
    }

    ok(`All ${notificationEvents.length} notification events have parent decisions (temporal linkage verified)`)
  } catch (error) {
    fail(`Exception checking orphan notifications: ${error.message}`)
  }
}

/**
 * Check 4: Resolved incidents must have terminal state (incident_resolved event)
 * 
 * Invariant: Any incident marked resolved=true in jarvis_incidents must have
 * a corresponding incident_resolved event in jarvis_incident_events.
 * This ensures the timeline captures the terminal state transition.
 */
async function checkMissingTerminalState() {
  try {
    // Get all resolved incidents
    const { data: resolvedIncidents, error: incidentsError } = await supabase
      .from('jarvis_incidents')
      .select('incident_id, resolved, resolved_at')
      .eq('resolved', true)

    if (incidentsError) {
      if (incidentsError.code === 'PGRST204' || incidentsError.message?.includes('does not exist')) {
        ok('jarvis_incidents table not found (migration may not be applied yet)')
        return
      }
      fail(`Error querying resolved incidents: ${incidentsError.message}`)
      return
    }

    if (!resolvedIncidents || resolvedIncidents.length === 0) {
      ok('No resolved incidents found')
      return
    }

    // Check for incident_resolved events
    const { data: resolvedEvents, error: eventsError } = await supabase
      .from('jarvis_incident_events')
      .select('incident_id')
      .eq('event_type', 'incident_resolved')

    if (eventsError) {
      if (eventsError.code === 'PGRST204' || eventsError.message?.includes('does not exist')) {
        ok('jarvis_incident_events table not found (migration may not be applied yet)')
        return
      }
      fail(`Error querying resolved events: ${eventsError.message}`)
      return
    }

    const resolvedEventIncidentIds = new Set((resolvedEvents || []).map(e => e.incident_id))
    const missingTerminalState = resolvedIncidents.filter(
      incident => !resolvedEventIncidentIds.has(incident.incident_id)
    )

    if (missingTerminalState.length > 0) {
      fail(
        `Found ${missingTerminalState.length} resolved incidents without incident_resolved event. ` +
        `Invariant: resolved=true incidents must have incident_resolved event. ` +
        `Example: incident_id=${missingTerminalState[0].incident_id}`
      )
      return
    }

    ok(`All ${resolvedIncidents.length} resolved incidents have terminal state (incident_resolved event)`)
  } catch (error) {
    fail(`Exception checking missing terminal state: ${error.message}`)
  }
}

/**
 * Main check function
 */
async function main() {
  console.log('\n🔍 Jarvis Phase 4 Observability Invariants Check\n')

  await checkMissingTraces()
  await checkIncompleteTraces()
  await checkOrphanNotifications()
  await checkMissingTerminalState()

  console.log('\n')

  if (errors.length > 0) {
    console.error('❌ Phase 4 invariant checks FAILED')
    console.error(`Found ${errors.length} violation(s):`)
    errors.forEach(e => console.error(`  - ${e}`))
    console.error('\nFix the issues above before committing/merging.')
    process.exit(1)
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:')
    warnings.forEach(w => console.log(`  - ${w}`))
  }

  console.log('✅ All Phase 4 observability invariants passed')
  process.exit(0)
}

main().catch(error => {
  console.error('❌ Fatal error running Phase 4 invariant checks:', error)
  process.exit(1)
})

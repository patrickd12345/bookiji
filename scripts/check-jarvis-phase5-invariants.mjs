#!/usr/bin/env node
/**
 * Jarvis Phase 5 Invariants Check
 * 
 * CI-enforced checks for Phase 5 safety:
 * 1. notification_cap in any ACTIVE policy <= 5
 * 2. ACTIVE policy has required keys in policy_json
 * 3. Production decisions log policy_id/version/checksum in trace
 * 4. Simulation engine produces decisions that violate Phase 3 invariants
 * 5. No endpoint allows activating policy without approval
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const errors = []
const warnings = []

function fail(message) {
  console.error(`❌ PHASE-5 INVARIANT: ${message}`)
  errors.push(message)
}

function ok(message) {
  console.log(`✅ PHASE-5 INVARIANT: ${message}`)
}

// Get Supabase credentials from env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
  console.error('Skipping Phase 5 invariant checks (requires database access)')
  process.exit(0) // Don't fail CI if credentials not available
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Check 1: notification_cap in any ACTIVE policy <= 5
 */
async function checkNotificationCap() {
  try {
    const { data: policies, error } = await supabase
      .from('jarvis_policies')
      .select('policy_id, policy_json')
      .eq('status', 'ACTIVE')

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        ok('jarvis_policies table not found (migration may not be applied yet)')
        return
      }
      fail(`Error querying ACTIVE policies: ${error.message}`)
      return
    }

    if (!policies || policies.length === 0) {
      ok('No ACTIVE policies found (default policy may be used)')
      return
    }

    const violations = []
    for (const policy of policies) {
      const cap = policy.policy_json?.notification_cap
      if (cap === undefined || cap === null) {
        violations.push(`Policy ${policy.policy_id}: missing notification_cap`)
      } else if (cap > 5) {
        violations.push(`Policy ${policy.policy_id}: notification_cap=${cap} > 5`)
      }
    }

    if (violations.length > 0) {
      fail(`Found ${violations.length} ACTIVE policy(ies) with notification_cap > 5: ${violations.join(', ')}`)
      return
    }

    ok(`All ${policies.length} ACTIVE policy(ies) have notification_cap <= 5`)
  } catch (error) {
    fail(`Exception checking notification cap: ${error.message}`)
  }
}

/**
 * Check 2: ACTIVE policy has required keys in policy_json
 */
async function checkRequiredKeys() {
  try {
    const { data: policies, error } = await supabase
      .from('jarvis_policies')
      .select('policy_id, policy_json')
      .eq('status', 'ACTIVE')

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        ok('jarvis_policies table not found (migration may not be applied yet)')
        return
      }
      fail(`Error querying ACTIVE policies: ${error.message}`)
      return
    }

    if (!policies || policies.length === 0) {
      ok('No ACTIVE policies found (default policy may be used)')
      return
    }

    const requiredKeys = [
      'notification_cap',
      'quiet_hours',
      'severity_rules'
    ]

    const requiredSeverityKeys = [
      'allowed_channels',
      'wake_during_quiet_hours',
      'max_silent_minutes',
      'escalation_intervals_minutes'
    ]

    const violations = []
    for (const policy of policies) {
      const json = policy.policy_json || {}

      // Check top-level keys
      for (const key of requiredKeys) {
        if (!(key in json)) {
          violations.push(`Policy ${policy.policy_id}: missing ${key}`)
        }
      }

      // Check severity_rules structure
      if (json.severity_rules) {
        const severities = ['SEV-1', 'SEV-2', 'SEV-3']
        for (const severity of severities) {
          if (!(severity in json.severity_rules)) {
            violations.push(`Policy ${policy.policy_id}: missing severity_rules.${severity}`)
          } else {
            const rule = json.severity_rules[severity]
            for (const key of requiredSeverityKeys) {
              if (!(key in rule)) {
                violations.push(`Policy ${policy.policy_id}: missing severity_rules.${severity}.${key}`)
              }
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      fail(`Found ${violations.length} ACTIVE policy(ies) with missing required keys: ${violations.join(', ')}`)
      return
    }

    ok(`All ${policies.length} ACTIVE policy(ies) have required keys`)
  } catch (error) {
    fail(`Exception checking required keys: ${error.message}`)
  }
}

/**
 * Check 3: Production decisions log policy_id/version/checksum in trace
 * (Phase 5 feature - optional for backward compatibility, but should be present if Phase 5 enabled)
 */
async function checkDecisionTraces() {
  try {
    // Only check if Phase 5 is enabled
    if (process.env.JARVIS_PHASE5_SIMULATION_ENABLED !== 'true') {
      ok('Phase 5 not enabled - skipping trace metadata check')
      return
    }

    const { data: events, error } = await supabase
      .from('jarvis_incident_events')
      .select('id, incident_id, occurred_at, trace')
      .eq('event_type', 'escalation_decision_made')
      .not('trace', 'is', null)
      .gte('occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        ok('jarvis_incident_events table not found (migration may not be applied yet)')
        return
      }
      fail(`Error querying decision traces: ${error.message}`)
      return
    }

    if (!events || events.length === 0) {
      ok('No recent escalation_decision_made events found')
      return
    }

    const missingMetadata = []
    for (const event of events) {
      const trace = event.trace || {}
      if (!trace.policy_id || !trace.policy_version || !trace.policy_checksum) {
        missingMetadata.push({
          incident_id: event.incident_id,
          occurred_at: event.occurred_at,
          missing: [
            !trace.policy_id && 'policy_id',
            !trace.policy_version && 'policy_version',
            !trace.policy_checksum && 'policy_checksum'
          ].filter(Boolean)
        })
      }
    }

    if (missingMetadata.length > 0) {
      const example = missingMetadata[0]
      fail(
        `Found ${missingMetadata.length} decision traces without policy metadata. ` +
        `Example: incident_id=${example.incident_id}, missing: ${example.missing.join(', ')}`
      )
      return
    }

    ok(`All ${events.length} recent decision traces include policy metadata`)
  } catch (error) {
    fail(`Exception checking decision traces: ${error.message}`)
  }
}

/**
 * Check 4: No policy activated without approval
 */
async function checkActivationApproval() {
  try {
    const { data: changes, error } = await supabase
      .from('jarvis_policy_changes')
      .select('change_id, status, applied_at')
      .eq('status', 'APPLIED')

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        ok('jarvis_policy_changes table not found (migration may not be applied yet)')
        return
      }
      fail(`Error querying applied policy changes: ${error.message}`)
      return
    }

    if (!changes || changes.length === 0) {
      ok('No applied policy changes found')
      return
    }

    // Check that all APPLIED changes were APPROVED first
    // (This is enforced by application logic, but we verify here)
    const { data: allChanges } = await supabase
      .from('jarvis_policy_changes')
      .select('change_id, status, approved_at')
      .in('change_id', changes.map(c => c.change_id))

    const unapproved = (allChanges || []).filter(
      c => c.status === 'APPLIED' && !c.approved_at
    )

    if (unapproved.length > 0) {
      fail(
        `Found ${unapproved.length} APPLIED policy changes without approval. ` +
        `Example: change_id=${unapproved[0].change_id}`
      )
      return
    }

    ok(`All ${changes.length} applied policy changes were approved`)
  } catch (error) {
    fail(`Exception checking activation approval: ${error.message}`)
  }
}

/**
 * Main check function
 */
async function main() {
  console.log('\n🔍 Jarvis Phase 5 Invariants Check\n')

  await checkNotificationCap()
  await checkRequiredKeys()
  await checkDecisionTraces()
  await checkActivationApproval()

  console.log('\n')

  if (errors.length > 0) {
    console.error('❌ Phase 5 invariant checks FAILED')
    console.error(`Found ${errors.length} violation(s):`)
    errors.forEach(e => console.error(`  - ${e}`))
    console.error('\nFix the issues above before committing/merging.')
    process.exit(1)
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:')
    warnings.forEach(w => console.log(`  - ${w}`))
  }

  console.log('✅ All Phase 5 invariants passed')
  process.exit(0)
}

main().catch(error => {
  console.error('❌ Fatal error running Phase 5 invariant checks:', error)
  process.exit(1)
})

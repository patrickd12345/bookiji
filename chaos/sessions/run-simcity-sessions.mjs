#!/usr/bin/env node
/**
 * MASTER RUNNER — SIMCITY CHAOS SESSIONS
 * 
 * Runs all three observation-only chaos sessions and generates consolidated findings.
 * 
 * OBSERVATION MODE ONLY — NO FIXES
 * 
 * STAGING MODE:
 * - Requires APP_ENV=staging
 * - Requires ENABLE_STAGING_INCIDENTS=true
 * - Hard-fails if APP_ENV=prod
 * - Enables real incident creation
 * - Sandboxes notifications (dry-run or test channel)
 */

import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { checkJsonIngress, JsonIngressValidationError } from '../preflight/check-json-ingress.mjs'
import { checkAuthSession, AuthSessionValidationError } from '../preflight/check-auth-session.mjs'

const SESSION_SCRIPTS = [
  'session1-valid-path-degradation.mjs',
  'session2-mixed-traffic.mjs',
  'session3-recovery-quietening.mjs'
]

const SESSION_NAMES = [
  'Valid Path Degradation',
  'Mixed Traffic (Noise vs Signal)',
  'Recovery & Quietening'
]

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const SESSIONS_DIR = path.resolve(process.cwd(), 'chaos', 'sessions')
const INGRESS_INVARIANT_ID = 'I-INGRESS-1'
const AUTH_SESSION_INVARIANT_ID = 'I-AUTH-SESSION-1'

// Environment detection
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'local'
const IS_STAGING = APP_ENV === 'staging'
const IS_PRODUCTION = APP_ENV === 'prod' || APP_ENV === 'production'
const ENABLE_STAGING_INCIDENTS = process.env.ENABLE_STAGING_INCIDENTS === 'true'

/**
 * Safety checks - hard-fail if production or missing staging flag
 */
function performSafetyChecks() {
  if (IS_PRODUCTION) {
    console.error('\n❌ PRODUCTION DETECTED — ABORTING\n')
    console.error('This script is FORBIDDEN in production.')
    console.error('Set APP_ENV=staging to run in staging mode.\n')
    process.exit(1)
  }

  if (IS_STAGING && !ENABLE_STAGING_INCIDENTS) {
    console.error('\n❌ STAGING MODE REQUIRES EXPLICIT FLAG\n')
    console.error('To enable incident creation in staging, set:')
    console.error('  ENABLE_STAGING_INCIDENTS=true\n')
    process.exit(1)
  }

  if (IS_STAGING) {
    console.log('\n⚠️  STAGING MODE ENABLED')
    console.log('  - Real incidents will be created')
    console.log('  - Notifications will be sandboxed')
    console.log('  - All observations will be recorded\n')
  }
}

async function runIngressPreflight() {
  try {
    const result = await checkJsonIngress({ baseUrl: BASE_URL })
    console.log(`\n${INGRESS_INVARIANT_ID} — JSON ingress validation passed (status=${result.status}, content-type=${result.contentType})`)
    return result
  } catch (error) {
    console.error(`\n${'-'.repeat(60)}`)
    console.error(`${INGRESS_INVARIANT_ID} — HTML ingress detected`)

    if (error instanceof JsonIngressValidationError) {
      console.error(`Status: ${error.status ?? 'unknown'}`)
      console.error(`Content-Type: ${error.contentType ?? 'unknown'}`)
      if (Array.isArray(error.violations) && error.violations.length > 0) {
        console.error('Violations:')
        error.violations.forEach((violation) => {
          console.error(`  - ${violation.type}: ${violation.detail}`)
        })
      }
      if (error.bodySnippet) {
        console.error(`Response snippet: ${error.bodySnippet}`)
      }
    } else {
      console.error(`Error: ${error.message}`)
    }

    const likelyCauses = error instanceof JsonIngressValidationError ? error.likelyCauses : null
    if (Array.isArray(likelyCauses) && likelyCauses.length > 0) {
      console.error('Likely causes:')
      likelyCauses.forEach(cause => console.error(`  - ${cause}`))
    } else {
      console.error('Likely cause: Vercel Preview Protection or an HTML auth wall on the preview endpoint.')
    }
    console.error(`${'-'.repeat(60)}\n`)

    throw new Error(`${INGRESS_INVARIANT_ID} violation - HTML ingress detected`, { cause: error })
  }
}

async function runAuthSessionPreflight() {
  // Only run in staging mode with incidents enabled
  if (!IS_STAGING || !ENABLE_STAGING_INCIDENTS) {
    console.log(`\n${AUTH_SESSION_INVARIANT_ID} — Skipped (not in staging mode with incidents enabled)`)
    return null
  }

  const authToken = process.env.AUTH_TOKEN || process.env.CHAOS_AUTH_TOKEN
  if (!authToken) {
    console.log(`\n${AUTH_SESSION_INVARIANT_ID} — Skipped (no auth token provided)`)
    return null
  }

  // Default to vendor role for chaos testing
  const expectedRole = process.env.EXPECTED_ROLE || 'vendor'

  try {
    const result = await checkAuthSession({ 
      baseUrl: BASE_URL,
      expectedRole,
      authToken
    })
    console.log(`\n${AUTH_SESSION_INVARIANT_ID} — Auth session validation passed`)
    console.log(`  User ID: ${result.user.id}`)
    console.log(`  Role: ${result.role}`)
    console.log(`  Expires at: ${result.expiresAt}`)
    console.log(`  Expires in: ${result.expiresIn}s`)
    return result
  } catch (error) {
    console.error(`\n${'-'.repeat(60)}`)
    console.error(`${AUTH_SESSION_INVARIANT_ID} — Auth session validation failed`)

    if (error instanceof AuthSessionValidationError || error.name === 'AuthSessionValidationError') {
      console.error(`Status: ${error.status ?? 'unknown'}`)
      console.error(`Content-Type: ${error.contentType ?? 'unknown'}`)
      console.error(`Reason: ${error.reason ?? 'Unknown'}`)
      if (Array.isArray(error.violations) && error.violations.length > 0) {
        console.error('Violations:')
        error.violations.forEach((violation) => {
          console.error(`  - ${violation.type}: ${violation.detail}`)
        })
      }
      if (error.bodySnippet) {
        console.error(`Response snippet: ${error.bodySnippet}`)
      }
    } else {
      console.error(`Error: ${error.message}`)
    }

    console.error('Likely cause: Invalid, expired, or missing authentication session.')
    console.error(`${'-'.repeat(60)}\n`)

    throw new Error(`${AUTH_SESSION_INVARIANT_ID} violation - Auth session validation failed`, { cause: error })
  }
}

/**
 * Print 3-second warning before execution
 */
async function printWarning() {
  console.log('\n' + '='.repeat(60))
  console.log('⚠️  CONTROLLED ESCALATION TEST — STAGING MODE')
  console.log('='.repeat(60))
  console.log(`Environment: ${APP_ENV}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Incident Creation: ${IS_STAGING && ENABLE_STAGING_INCIDENTS ? 'ENABLED' : 'DISABLED'}`)
  console.log(`Notification Sandboxing: ${IS_STAGING ? 'ENABLED' : 'N/A'}`)
  console.log('='.repeat(60))
  console.log('\nStarting in 3 seconds...\n')
  
  for (let i = 3; i > 0; i--) {
    process.stdout.write(`\r${i}... `)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  console.log('\n')
}

async function runSession(scriptName, sessionName) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Running: ${sessionName}`)
  console.log(`Script: ${scriptName}`)
  console.log(`${'='.repeat(60)}\n`)
  
  return new Promise((resolve, reject) => {
    // Resolve script path relative to the original working directory
    const originalCwd = process.cwd()
    const scriptPath = path.isAbsolute(scriptName) 
      ? scriptName 
      : path.resolve(SESSIONS_DIR, scriptName)
    
    const child = spawn('node', [scriptPath], {
      cwd: originalCwd,
      env: {
        ...process.env,
        BASE_URL
      },
      stdio: 'inherit'
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${sessionName} completed successfully\n`)
        resolve()
      } else {
        console.error(`\n❌ ${sessionName} failed with code ${code}\n`)
        reject(new Error(`Session failed with code ${code}`))
      }
    })
    
    child.on('error', (error) => {
      console.error(`\n❌ ${sessionName} error: ${error.message}\n`)
      reject(error)
    })
  })
}

async function findObservationFiles() {
  const files = await fs.readdir(SESSIONS_DIR)
  return files
    .filter(f => f.endsWith('-observations.json'))
    .sort()
    .slice(-3) // Get the 3 most recent (one from each session)
}

async function generateConsolidatedFindings() {
  console.log(`\n${'='.repeat(60)}`)
  console.log('Generating Consolidated Findings')
  console.log(`${'='.repeat(60)}\n`)
  
  const observationFiles = await findObservationFiles()
  
  if (observationFiles.length === 0) {
    console.log('⚠️  No observation files found')
    return
  }
  
  const sessions = []
  for (const file of observationFiles) {
    const filePath = path.join(SESSIONS_DIR, file)
    const content = await fs.readFile(filePath, 'utf-8')
    sessions.push(JSON.parse(content))
  }
  
  // Extract incident IDs and detailed observations
  const incidentIds = []
  const badgesObserved = []
  const layersObserved = []
  const escalationDecisionsObserved = []
  
  sessions.forEach(s => {
    const observations = s.observations || []
    observations.forEach(obs => {
      if (obs.phase === 'INCIDENT_CREATE' && obs.event === 'incident_created' && obs.data?.incident_id) {
        incidentIds.push(obs.data.incident_id)
      }
      if (obs.phase === 'INCIDENT_DETAILS' && obs.event === 'explain_output') {
        if (obs.data?.badges) {
          badgesObserved.push(...(Array.isArray(obs.data.badges) ? obs.data.badges : [obs.data.badges]))
        }
        if (obs.data?.layers) {
          layersObserved.push(...(Array.isArray(obs.data.layers) ? obs.data.layers : [obs.data.layers]))
        }
        if (obs.data?.escalation_decisions) {
          escalationDecisionsObserved.push(...(Array.isArray(obs.data.escalation_decisions) ? obs.data.escalation_decisions : [obs.data.escalation_decisions]))
        }
      }
    })
  })

  // Generate consolidated summary
  const consolidated = {
    generated_at: new Date().toISOString(),
    environment: APP_ENV,
    staging_mode: IS_STAGING && ENABLE_STAGING_INCIDENTS,
    sessions: sessions.map(s => ({
      session_id: s.session_id,
      session_type: s.session_type,
      start_time: s.start_time,
      end_time: s.end_time,
      duration_ms: s.duration_ms,
      findings: s.findings,
      observations: s.observations // Include observations for detailed analysis
    })),
    consolidated_findings: {
      total_sessions: sessions.length,
      total_observations: sessions.reduce((sum, s) => sum + s.findings.total_observations, 0),
      incidents_created_any_session: sessions.some(s => s.findings.incident_creation_observed),
      incidents_suppressed_any_session: sessions.some(s => s.findings.incident_suppression_observed),
      errors_observed_any_session: sessions.some(s => s.findings.errors_observed > 0),
      silences_observed_any_session: sessions.some(s => s.findings.silences_observed > 0),
      valid_failures_surfaced: sessions.some(s => s.findings.valid_failures_surfaced),
      ghost_activity_observed: sessions.some(s => s.findings.ghost_activity > 0),
      quietening_observed: sessions.some(s => s.findings.quietening_observed),
      // STAGING-specific findings
      incident_ids_created: incidentIds.length > 0 ? incidentIds : undefined,
      badges_observed: badgesObserved.length > 0 ? badgesObserved : undefined,
      layers_observed: layersObserved.length > 0 ? layersObserved : undefined,
      escalation_decisions_observed: escalationDecisionsObserved.length > 0 ? escalationDecisionsObserved : undefined
    },
    unanswered_questions: [
      'Did valid failures surface as incidents?',
      'Did Jarvis classification remain factual?',
      'Did error aggregation work correctly?',
      'Did failures become quieter or noisier over time?',
      'Did valid failures still surface despite noise?',
      'Did incidents ignore noise correctly?',
      'Did Jarvis stay factual and calm?',
      'Were metrics polluted by junk traffic?',
      'Did incidents resolve cleanly after stress?',
      'Were there lingering alerts?',
      'Did Jarvis de-escalate cleanly?',
      'Was there any ghost activity?'
    ],
    cannot_verify: [
      'Whether incidents are created for all valid failures',
      'Whether suppression windows are appropriate',
      'Whether latency degradation triggers incidents',
      'Whether DB partial failures trigger incidents',
      'Whether Stripe timeouts trigger incidents',
      'Whether noise rejection is fast enough',
      'Whether signal failures are detected correctly',
      'Whether incident classification ignores noise',
      'Whether metrics aggregation filters noise',
      'Whether Jarvis remains composed under noise',
      'Whether incident resolution is automatic',
      'Whether de-escalation logic works correctly',
      'Whether ghost activity indicates bugs',
      'Whether quietening is consistent'
    ]
  }
  
  // Save consolidated findings
  const consolidatedPath = path.join(SESSIONS_DIR, `consolidated-findings-${Date.now()}.json`)
  await fs.writeFile(consolidatedPath, JSON.stringify(consolidated, null, 2))
  console.log(`\n[SAVED] Consolidated Findings: ${consolidatedPath}`)
  
  // Generate markdown report
  const report = generateConsolidatedReport(consolidated)
  const reportPath = path.join(SESSIONS_DIR, `consolidated-findings-${Date.now()}.md`)
  await fs.writeFile(reportPath, report)
  console.log(`[SAVED] Consolidated Report: ${reportPath}`)
  
  return consolidated
}

function generateConsolidatedReport(consolidated) {
  return `# SimCity Chaos Sessions — Consolidated Findings

**Generated**: ${consolidated.generated_at}
**Environment**: ${consolidated.environment}
**STAGING Mode**: ${consolidated.staging_mode ? 'ENABLED' : 'DISABLED'}

## Executive Summary

This document consolidates findings from three chaos testing sessions:
1. **Valid Path Degradation** — Testing whether valid booking flows produce incidents when degraded
2. **Mixed Traffic** — Verifying that invalid noise does not drown out valid distress
3. **Recovery & Quietening** — Testing whether the system gets quieter after stress

## Session Summary

${consolidated.sessions.map((s, i) => `
### Session ${i + 1}: ${SESSION_NAMES[i]}

- **Session ID**: ${s.session_id}
- **Type**: ${s.session_type}
- **Duration**: ${(s.duration_ms / 1000).toFixed(1)}s
- **Observations**: ${s.findings.total_observations}
- **Key Findings**:
  ${Object.entries(s.findings).filter(([k]) => k !== 'total_observations').map(([k, v]) => `  - ${k}: ${v}`).join('\n  ')}
`).join('\n')}

## Consolidated Findings

### Overall Statistics
- **Total Sessions**: ${consolidated.consolidated_findings.total_sessions}
- **Total Observations**: ${consolidated.consolidated_findings.total_observations}

### Incident Behavior
- **Incidents Created (any session)**: ${consolidated.consolidated_findings.incidents_created_any_session ? 'YES' : 'NO'}
- **Incidents Suppressed (any session)**: ${consolidated.consolidated_findings.incidents_suppressed_any_session ? 'YES' : 'NO'}
- **Errors Observed (any session)**: ${consolidated.consolidated_findings.errors_observed_any_session ? 'YES' : 'NO'}
- **Silences Observed (any session)**: ${consolidated.consolidated_findings.silences_observed_any_session ? 'YES' : 'NO'}

### Signal vs Noise
- **Valid Failures Surfaced**: ${consolidated.consolidated_findings.valid_failures_surfaced ? 'YES' : 'NO'}

### Recovery Behavior
- **Ghost Activity Observed**: ${consolidated.consolidated_findings.ghost_activity_observed ? 'YES' : 'NO'}
- **Quietening Observed**: ${consolidated.consolidated_findings.quietening_observed ? 'YES' : 'NO'}

### STAGING-Specific Findings
${consolidated.staging_mode ? `
- **Incident IDs Created**: ${consolidated.consolidated_findings.incident_ids_created ? consolidated.consolidated_findings.incident_ids_created.length : 0}
  ${consolidated.consolidated_findings.incident_ids_created ? consolidated.consolidated_findings.incident_ids_created.map(id => `  - ${id}`).join('\n') : '  - None'}
- **Badges Observed**: ${consolidated.consolidated_findings.badges_observed ? consolidated.consolidated_findings.badges_observed.length : 0}
- **Layers Observed**: ${consolidated.consolidated_findings.layers_observed ? consolidated.consolidated_findings.layers_observed.length : 0}
  ${consolidated.consolidated_findings.layers_observed ? consolidated.consolidated_findings.layers_observed.map(l => `  - ${l.layer || l}`).join('\n') : '  - None'}
- **Escalation Decisions**: ${consolidated.consolidated_findings.escalation_decisions_observed ? consolidated.consolidated_findings.escalation_decisions_observed.length : 0}
` : '- STAGING mode not enabled - observations only'}

## Unanswered Questions

${consolidated.unanswered_questions.map(q => `- ${q}`).join('\n')}

## What Cannot Yet Be Verified

${consolidated.cannot_verify.map(v => `- ${v}`).join('\n')}

## Next Steps

These findings are OBSERVATIONS ONLY. No fixes have been applied.

Human decision-makers should review:
1. Whether incident creation behavior matches expectations
2. Whether suppression windows are appropriate
3. Whether noise filtering is effective
4. Whether recovery behavior is acceptable
5. Whether any observed behaviors indicate bugs

## Raw Data

See individual session observation files for complete structured data:
${consolidated.sessions.map(s => `- \`${s.session_id}-observations.json\``).join('\n')}
`
}

/**
 * Check exit conditions - non-zero if validation fails
 */
async function checkExitConditions(consolidated) {
  if (!consolidated) {
    console.error('\n❌ No consolidated findings generated')
    return 1
  }

  const findings = consolidated.consolidated_findings
  let exitCode = 0
  const errors = []

  // Check: At least one incident must be created in STAGING
  if (IS_STAGING && !findings.incidents_created_any_session) {
    errors.push('No incidents created in STAGING (expected at least one)')
    exitCode = 1
  }

  // Check: No Layer 4 or 5 should appear (dormant layers)
  // Check individual session observations for layer violations
  for (const session of consolidated.sessions) {
    // Look for layer 4 or 5 in observations
    const observations = session.observations || []
    const layerViolations = observations.filter(obs => {
      if (obs.data?.layers) {
        return obs.data.layers.some(layer => 
          layer.layer === 'LAYER_4' || layer.layer === 'LAYER_5'
        )
      }
      return false
    })
    
    if (layerViolations.length > 0) {
      errors.push(`Layer 4 or 5 detected in ${session.session_id} (dormant layers should never appear)`)
      exitCode = 1
    }
  }

  // Check: Jarvis should not guess or recommend actions (should be factual only)
  // This is harder to validate automatically, but we can check for certain patterns
  // For now, we'll rely on manual review of explain output

  if (errors.length > 0) {
    console.error('\n❌ VALIDATION FAILURES:')
    errors.forEach(err => console.error(`  - ${err}`))
  }

  return exitCode
}

async function main() {
  try {
    await runIngressPreflight()
    await runAuthSessionPreflight()
    performSafetyChecks()
  
    // Print warning and wait
    await printWarning()

    console.log(`\n${'='.repeat(60)}`)
    console.log('SIMCITY CHAOS SESSIONS ƒ?" OBSERVATION MODE')
    if (IS_STAGING) {
      console.log('STAGING MODE ƒ?" REAL INCIDENTS ENABLED')
    }
    console.log(`${'='.repeat(60)}`)
    console.log(`Base URL: ${BASE_URL}`)
    console.log(`Environment: ${APP_ENV}`)
    console.log(`Sessions: ${SESSION_SCRIPTS.length}`)
    console.log(`${'='.repeat(60)}\n`)
    
    const startTime = Date.now()
    
    // Run all sessions sequentially
    for (let i = 0; i < SESSION_SCRIPTS.length; i++) {
      await runSession(SESSION_SCRIPTS[i], SESSION_NAMES[i])
      
      // Small delay between sessions
      if (i < SESSION_SCRIPTS.length - 1) {
        console.log('\nƒ?,‹,?  Waiting 10 seconds before next session...\n')
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
    }
    
    // Generate consolidated findings
    const consolidated = await generateConsolidatedFindings()
    
    // Check exit conditions
    const exitCode = await checkExitConditions(consolidated)
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n${'='.repeat(60)}`)
    if (exitCode === 0) {
      console.log(`ƒo. ALL SESSIONS COMPLETE`)
    } else {
      console.log(`ƒsÿ‹,?  SESSIONS COMPLETE WITH VALIDATION FAILURES`)
    }
    console.log(`Total Duration: ${duration}s`)
    console.log(`${'='.repeat(60)}\n`)
    
    process.exit(exitCode)
  } catch (error) {
    console.error(`\nƒ?O SESSION RUNNER FAILED: ${error.message}\n`)
    process.exit(1)
  }
}

main()


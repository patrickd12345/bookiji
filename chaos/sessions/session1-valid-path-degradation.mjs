#!/usr/bin/env node
/**
 * SESSION 1 — VALID PATH DEGRADATION (SLOW FAILURE)
 * 
 * Objective: Test whether valid booking flows, when degraded, produce incidents instead of silence.
 * 
 * OBSERVATION MODE ONLY — NO FIXES
 */

import fs from 'fs/promises'
import path from 'path'

const SESSION_ID = `session1-${Date.now()}`
const OBSERVATIONS = []
const START_TIME = Date.now()

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const DURATION_MS = 2 * 60 * 1000 // 2-3 minutes
const REQUEST_INTERVAL_MS = 2000 // Every 2 seconds
const DEGRADATION_STAGES = [
  { name: 'baseline', latency_ms: 0, db_failure_rate: 0, stripe_timeout: false },
  { name: 'latency_500ms', latency_ms: 500, db_failure_rate: 0, stripe_timeout: false },
  { name: 'latency_2000ms', latency_ms: 2000, db_failure_rate: 0, stripe_timeout: false },
  { name: 'db_partial_10pct', latency_ms: 1000, db_failure_rate: 0.1, stripe_timeout: false },
  { name: 'db_partial_30pct', latency_ms: 1500, db_failure_rate: 0.3, stripe_timeout: false },
  { name: 'stripe_timeout', latency_ms: 500, db_failure_rate: 0, stripe_timeout: true },
  { name: 'combined_degradation', latency_ms: 2000, db_failure_rate: 0.2, stripe_timeout: false }
]

function logObservation(phase, event, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    elapsed_ms: Date.now() - START_TIME,
    phase,
    event,
    data
  }
  OBSERVATIONS.push(entry)
  console.log(`[OBS] ${phase} | ${event}: ${JSON.stringify(data).slice(0, 200)}`)
}

/**
 * Create a valid booking request payload
 */
function createValidBookingPayload() {
  const now = new Date()
  const startTime = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000) // 30 minutes duration
  
  return {
    providerId: 'test-provider-id',
    serviceId: 'test-service-id',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    amountUSD: 50.00
  }
}

/**
 * Make authenticated booking request
 * Note: In real scenario, we'd need proper auth. For observation, we'll use service role or mock.
 */
async function makeBookingRequest(stage, attemptNum) {
  const payload = createValidBookingPayload()
  const startTime = Date.now()
  
  try {
    // Simulate degradation based on stage
    if (stage.latency_ms > 0) {
      await new Promise(resolve => setTimeout(resolve, stage.latency_ms))
    }
    
    // Simulate DB failure
    if (Math.random() < stage.db_failure_rate) {
      logObservation('BOOKING_REQUEST', 'simulated_db_failure', {
        stage: stage.name,
        attempt: attemptNum,
        payload
      })
      return {
        success: false,
        status: 500,
        error: 'Database connection timeout',
        latency_ms: Date.now() - startTime
      }
    }
    
    // Simulate Stripe timeout
    if (stage.stripe_timeout && Math.random() < 0.5) {
      logObservation('BOOKING_REQUEST', 'simulated_stripe_timeout', {
        stage: stage.name,
        attempt: attemptNum,
        payload
      })
      return {
        success: false,
        status: 504,
        error: 'Stripe API timeout',
        latency_ms: Date.now() - startTime
      }
    }
    
    // Make actual request (will fail auth, but we observe the behavior)
    const response = await fetch(`${BASE_URL}/api/bookings/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30s timeout
    })
    
    const latency = Date.now() - startTime
    const text = await response.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }
    
    logObservation('BOOKING_REQUEST', response.ok ? 'success' : 'failure', {
      stage: stage.name,
      attempt: attemptNum,
      status: response.status,
      latency_ms: latency,
      response: json
    })
    
    return {
      success: response.ok,
      status: response.status,
      latency_ms: latency,
      response: json
    }
  } catch (error) {
    const latency = Date.now() - startTime
    logObservation('BOOKING_REQUEST', 'exception', {
      stage: stage.name,
      attempt: attemptNum,
      error: error.message,
      latency_ms: latency
    })
    
    return {
      success: false,
      status: 0,
      error: error.message,
      latency_ms: latency
    }
  }
}

/**
 * Check for incident creation via Jarvis (GET - check only)
 */
async function checkIncidents() {
  try {
    const response = await fetch(`${BASE_URL}/api/jarvis/detect`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    logObservation('INCIDENT_CHECK', 'jarvis_status', {
      should_alert: data.should_alert,
      reason: data.reason,
      has_snapshot: !!data.snapshot,
      snapshot_severity: data.snapshot?.severity_guess,
      snapshot_env: data.snapshot?.env
    })
    
    return data
  } catch (error) {
    logObservation('INCIDENT_CHECK', 'exception', {
      error: error.message
    })
    return null
  }
}

/**
 * Create incident via Jarvis (POST - creates real incident in STAGING)
 */
async function createIncident() {
  try {
    const ownerPhone = process.env.JARVIS_OWNER_PHONE || '+1234567890'
    const response = await fetch(`${BASE_URL}/api/jarvis/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone: ownerPhone })
    })
    
    const data = await response.json()
    
    if (data.incident_id) {
      logObservation('INCIDENT_CREATE', 'incident_created', {
        incident_id: data.incident_id,
        snapshot_taken: data.snapshot_taken,
        assessment_done: data.assessment_done,
        sms_sent: data.sms_sent,
        duplicate_suppressed: data.duplicate_suppressed
      })
      
      // Fetch detailed explanation
      await fetchIncidentDetails(data.incident_id)
    } else {
      logObservation('INCIDENT_CREATE', 'no_incident', {
        message: data.message,
        reason: data.reason
      })
    }
    
    return data
  } catch (error) {
    logObservation('INCIDENT_CREATE', 'exception', {
      error: error.message
    })
    return null
  }
}

/**
 * Fetch detailed incident explanation (badges, layers, escalation decisions)
 */
async function fetchIncidentDetails(incidentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/jarvis/incidents/${incidentId}/explain`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      logObservation('INCIDENT_DETAILS', 'fetch_failed', {
        incident_id: incidentId,
        status: response.status
      })
      return null
    }
    
    const data = await response.json()
    
    // Extract badges, layers, escalation decisions from timeline
    const timeline = data.timeline || []
    const badges = []
    const layers = []
    const escalationDecisions = []
    
    timeline.forEach(event => {
      if (event.badges) {
        badges.push(...event.badges)
      }
      if (event.layers) {
        layers.push(...event.layers)
      }
      if (event.event_type === 'escalation_decision_made') {
        escalationDecisions.push({
          decision_type: event.decision?.type,
          reason: event.explanation,
          trace: event.trace
        })
      }
    })
    
    logObservation('INCIDENT_DETAILS', 'explain_output', {
      incident_id: incidentId,
      badges: badges.length > 0 ? badges : undefined,
      layers: layers.length > 0 ? layers : undefined,
      escalation_decisions: escalationDecisions.length > 0 ? escalationDecisions : undefined,
      timeline_events: timeline.length,
      summary: data.summary
    })
    
    return data
  } catch (error) {
    logObservation('INCIDENT_DETAILS', 'exception', {
      incident_id: incidentId,
      error: error.message
    })
    return null
  }
}

/**
 * Main session execution
 */
async function runSession() {
  console.log(`\n=== SESSION 1: VALID PATH DEGRADATION ===\n`)
  console.log(`Duration: ${DURATION_MS / 1000}s`)
  console.log(`Base URL: ${BASE_URL}\n`)
  
  logObservation('SESSION', 'start', {
    session_id: SESSION_ID,
    duration_ms: DURATION_MS,
    base_url: BASE_URL
  })
  
  let requestCount = 0
  const results = {
    total_requests: 0,
    successful: 0,
    failed: 0,
    incidents_created: 0,
    incidents_suppressed: 0,
    errors_by_type: {},
    latency_distribution: []
  }
  
  // Run through degradation stages
  for (const stage of DEGRADATION_STAGES) {
    console.log(`\n--- Stage: ${stage.name} ---\n`)
    logObservation('STAGE', 'start', stage)
    
    const stageEndTime = Date.now() + (DURATION_MS / DEGRADATION_STAGES.length)
    let stageRequestCount = 0
    
    while (Date.now() < stageEndTime) {
      requestCount++
      stageRequestCount++
      
      const result = await makeBookingRequest(stage, requestCount)
      
      results.total_requests++
      if (result.success) {
        results.successful++
      } else {
        results.failed++
        const errorType = result.error || `status_${result.status}`
        results.errors_by_type[errorType] = (results.errors_by_type[errorType] || 0) + 1
      }
      
      if (result.latency_ms) {
        results.latency_distribution.push(result.latency_ms)
      }
      
      // Check for incidents periodically (every 5 requests)
      if (requestCount % 5 === 0) {
        const incidentCheck = await checkIncidents()
        if (incidentCheck?.should_alert) {
          // In STAGING mode, create real incident
          const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'local'
          const IS_STAGING = APP_ENV === 'staging'
          const ENABLE_STAGING_INCIDENTS = process.env.ENABLE_STAGING_INCIDENTS === 'true'
          
          if (IS_STAGING && ENABLE_STAGING_INCIDENTS) {
            // Create real incident
            const createResult = await createIncident()
            if (createResult?.incident_id) {
              results.incidents_created++
            }
          } else {
            // Just log observation (local mode)
            results.incidents_created++
            logObservation('INCIDENT', 'would_create', {
              reason: incidentCheck.reason,
              snapshot: incidentCheck.snapshot,
              mode: 'local_observation'
            })
          }
        } else if (incidentCheck && !incidentCheck.should_alert) {
          results.incidents_suppressed++
          logObservation('INCIDENT', 'suppressed', {
            reason: incidentCheck.reason
          })
        }
      }
      
      // Wait before next request
      await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL_MS))
    }
    
    logObservation('STAGE', 'end', {
      stage: stage.name,
      requests: stageRequestCount,
      successful: results.successful,
      failed: results.failed
    })
  }
  
  // Final incident check
  console.log('\n--- Final Incident Check ---\n')
  const finalCheck = await checkIncidents()
  if (finalCheck) {
    logObservation('FINAL_CHECK', 'incident_status', finalCheck)
    
    // In STAGING, create final incident if needed
    const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'local'
    const IS_STAGING = APP_ENV === 'staging'
    const ENABLE_STAGING_INCIDENTS = process.env.ENABLE_STAGING_INCIDENTS === 'true'
    
    if (IS_STAGING && ENABLE_STAGING_INCIDENTS && finalCheck.should_alert) {
      await createIncident()
    }
  }
  
  // Calculate statistics
  const avgLatency = results.latency_distribution.length > 0
    ? results.latency_distribution.reduce((a, b) => a + b, 0) / results.latency_distribution.length
    : 0
  
  const p95Latency = results.latency_distribution.length > 0
    ? results.latency_distribution.sort((a, b) => a - b)[Math.floor(results.latency_distribution.length * 0.95)]
    : 0
  
  results.avg_latency_ms = avgLatency
  results.p95_latency_ms = p95Latency
  results.duration_ms = Date.now() - START_TIME
  
  logObservation('SESSION', 'end', {
    session_id: SESSION_ID,
    results
  })
  
  // Save observations
  await saveObservations()
  
  console.log(`\n=== SESSION 1 COMPLETE ===\n`)
  console.log(`Total Requests: ${results.total_requests}`)
  console.log(`Successful: ${results.successful}`)
  console.log(`Failed: ${results.failed}`)
  console.log(`Incidents Created: ${results.incidents_created}`)
  console.log(`Incidents Suppressed: ${results.incidents_suppressed}`)
  console.log(`Avg Latency: ${avgLatency.toFixed(0)}ms`)
  console.log(`P95 Latency: ${p95Latency.toFixed(0)}ms`)
}

async function saveObservations() {
  const outputDir = path.join(process.cwd(), 'chaos', 'sessions')
  await fs.mkdir(outputDir, { recursive: true })
  
  const jsonPath = path.join(outputDir, `${SESSION_ID}-observations.json`)
  const reportPath = path.join(outputDir, `${SESSION_ID}-report.md`)
  
  const summary = {
    session_id: SESSION_ID,
    session_type: 'valid_path_degradation',
    start_time: new Date(START_TIME).toISOString(),
    end_time: new Date().toISOString(),
    duration_ms: Date.now() - START_TIME,
    observations: OBSERVATIONS,
    findings: {
      total_observations: OBSERVATIONS.length,
      incident_creation_observed: OBSERVATIONS.some(o => o.event === 'created'),
      incident_suppression_observed: OBSERVATIONS.some(o => o.event === 'suppressed'),
      errors_observed: OBSERVATIONS.filter(o => o.event === 'exception' || o.event === 'failure').length,
      silences_observed: OBSERVATIONS.filter(o => o.event === 'suppressed').length
    }
  }
  
  await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2))
  console.log(`\n[SAVED] Observations: ${jsonPath}`)
  
  // Generate markdown report
  const report = generateMarkdownReport(summary)
  await fs.writeFile(reportPath, report)
  console.log(`[SAVED] Report: ${reportPath}`)
}

function generateMarkdownReport(summary) {
  const incidents = OBSERVATIONS.filter(o => o.phase === 'INCIDENT')
  const bookings = OBSERVATIONS.filter(o => o.phase === 'BOOKING_REQUEST')
  const failures = bookings.filter(b => b.event === 'failure' || b.event === 'exception')
  
  return `# Session 1: Valid Path Degradation Report

**Session ID**: ${SESSION_ID}
**Start Time**: ${summary.start_time}
**End Time**: ${summary.end_time}
**Duration**: ${(summary.duration_ms / 1000).toFixed(1)}s

## Executive Summary

This session tested whether valid booking flows, when degraded, produce incidents instead of silence.

## Observations

### Total Observations
- **Total**: ${summary.findings.total_observations}
- **Booking Requests**: ${bookings.length}
- **Failures**: ${failures.length}
- **Incident Checks**: ${incidents.length}

### Incident Behavior
- **Incidents Created**: ${summary.findings.incident_creation_observed ? 'YES' : 'NO'}
- **Incidents Suppressed**: ${summary.findings.incident_suppression_observed ? 'YES' : 'NO'}
- **Errors Observed**: ${summary.findings.errors_observed}
- **Silences Observed**: ${summary.findings.silences_observed}

## Detailed Findings

### Failures Observed
${failures.length > 0 ? failures.map(f => `- **${f.timestamp}**: ${f.event} - ${JSON.stringify(f.data).slice(0, 200)}`).join('\n') : '- None'}

### Incidents Observed
${incidents.length > 0 ? incidents.map(i => `- **${i.timestamp}**: ${i.event} - ${JSON.stringify(i.data).slice(0, 200)}`).join('\n') : '- None'}

## Unanswered Questions

1. Did valid failures surface as incidents?
2. Did Jarvis classification remain factual?
3. Did error aggregation work correctly?
4. Did failures become quieter or noisier over time?

## What Cannot Yet Be Verified

- Whether incidents are created for all valid failures
- Whether suppression windows are appropriate
- Whether latency degradation triggers incidents
- Whether DB partial failures trigger incidents
- Whether Stripe timeouts trigger incidents

## Raw Observations

See \`${SESSION_ID}-observations.json\` for complete structured data.
`
}

// Run session
runSession().catch(error => {
  console.error('Session failed:', error)
  logObservation('SESSION', 'error', {
    error: error.message,
    stack: error.stack
  })
  saveObservations().finally(() => {
    process.exit(1)
  })
})


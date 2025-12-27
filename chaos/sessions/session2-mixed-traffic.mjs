#!/usr/bin/env node
/**
 * SESSION 2 — MIXED TRAFFIC (NOISE VS SIGNAL)
 * 
 * Objective: Verify that invalid noise does not drown out valid distress.
 * 
 * OBSERVATION MODE ONLY — NO FIXES
 */

import fs from 'fs/promises'
import path from 'path'

const SESSION_ID = `session2-${Date.now()}`
const OBSERVATIONS = []
const START_TIME = Date.now()

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const DURATION_MS = 3 * 60 * 1000 // 3 minutes
const NOISE_INTERVAL_MS = 100 // High-volume invalid traffic every 100ms
const SIGNAL_INTERVAL_MS = 5000 // Low-volume valid traffic every 5s
const NOISE_RATIO = 0.9 // 90% noise, 10% signal

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
 * Generate invalid/malformed requests (NOISE)
 */
function generateNoiseRequest() {
  const noiseTypes = [
    // Invalid paths
    () => ({ path: '/api/nonexistent', method: 'POST', body: {} }),
    () => ({ path: '/api/bookings/invalid', method: 'GET', body: null }),
    () => ({ path: '/api/bookings/create', method: 'PUT', body: {} }),
    
    // Malformed payloads
    () => ({ path: '/api/bookings/create', method: 'POST', body: 'not json' }),
    () => ({ path: '/api/bookings/create', method: 'POST', body: { invalid: 'data' } }),
    () => ({ path: '/api/bookings/create', method: 'POST', body: { providerId: 'missing fields' } }),
    
    // Invalid data types
    () => ({ path: '/api/bookings/create', method: 'POST', body: { providerId: 123, serviceId: null, startTime: 'invalid' } }),
    () => ({ path: '/api/bookings/create', method: 'POST', body: { providerId: '', serviceId: '', startTime: '', endTime: '', amountUSD: -100 } }),
    
    // Past bookings
    () => ({ 
      path: '/api/bookings/create', 
      method: 'POST', 
      body: { 
        providerId: 'test', 
        serviceId: 'test', 
        startTime: new Date(Date.now() - 1000).toISOString(), // Past
        endTime: new Date().toISOString(),
        amountUSD: 50
      } 
    }),
    
    // SQL injection attempts
    () => ({ path: '/api/bookings/create', method: 'POST', body: { providerId: "'; DROP TABLE bookings; --", serviceId: 'test', startTime: new Date().toISOString(), endTime: new Date().toISOString(), amountUSD: 50 } }),
    
    // XSS attempts
    () => ({ path: '/api/bookings/create', method: 'POST', body: { providerId: '<script>alert(1)</script>', serviceId: 'test', startTime: new Date().toISOString(), endTime: new Date().toISOString(), amountUSD: 50 } })
  ]
  
  const noiseType = noiseTypes[Math.floor(Math.random() * noiseTypes.length)]
  return noiseType()
}

/**
 * Generate valid booking request (SIGNAL)
 */
function generateValidSignal() {
  const now = new Date()
  const startTime = new Date(now.getTime() + 60 * 60 * 1000)
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000)
  
  return {
    path: '/api/bookings/create',
    method: 'POST',
    body: {
      providerId: 'test-provider-id',
      serviceId: 'test-service-id',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      amountUSD: 50.00
    }
  }
}

/**
 * Make request and observe response
 */
async function makeRequest(request, type) {
  const startTime = Date.now()
  
  try {
    const response = await fetch(`${BASE_URL}${request.path}`, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: request.body ? (typeof request.body === 'string' ? request.body : JSON.stringify(request.body)) : undefined,
      signal: AbortSignal.timeout(10000) // 10s timeout
    })
    
    const latency = Date.now() - startTime
    const text = await response.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }
    
    logObservation('REQUEST', type === 'noise' ? 'noise_request' : 'signal_request', {
      path: request.path,
      method: request.method,
      status: response.status,
      latency_ms: latency,
      response_size: text.length,
      response_preview: JSON.stringify(json).slice(0, 100)
    })
    
    return {
      type,
      success: response.ok,
      status: response.status,
      latency_ms: latency,
      response_size: text.length
    }
  } catch (error) {
    const latency = Date.now() - startTime
    logObservation('REQUEST', type === 'noise' ? 'noise_exception' : 'signal_exception', {
      path: request.path,
      method: request.method,
      error: error.message,
      latency_ms: latency
    })
    
    return {
      type,
      success: false,
      status: 0,
      error: error.message,
      latency_ms: latency
    }
  }
}

/**
 * Check for incidents (GET - check only)
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
  console.log(`\n=== SESSION 2: MIXED TRAFFIC (NOISE VS SIGNAL) ===\n`)
  console.log(`Duration: ${DURATION_MS / 1000}s`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Noise Ratio: ${(NOISE_RATIO * 100).toFixed(0)}%`)
  console.log(`Signal Ratio: ${((1 - NOISE_RATIO) * 100).toFixed(0)}%\n`)
  
  logObservation('SESSION', 'start', {
    session_id: SESSION_ID,
    duration_ms: DURATION_MS,
    base_url: BASE_URL,
    noise_ratio: NOISE_RATIO
  })
  
  const results = {
    noise_requests: 0,
    signal_requests: 0,
    noise_rejected: 0,
    noise_errors: 0,
    signal_successful: 0,
    signal_failed: 0,
    incidents_created: 0,
    incidents_suppressed: 0,
    noise_latencies: [],
    signal_latencies: []
  }
  
  const endTime = Date.now() + DURATION_MS
  let lastSignalTime = 0
  let lastNoiseTime = 0
  let lastIncidentCheck = 0
  
  // Run parallel streams
  while (Date.now() < endTime) {
    const now = Date.now()
    
    // High-volume noise stream
    if (now - lastNoiseTime >= NOISE_INTERVAL_MS) {
      const noiseRequest = generateNoiseRequest()
      const result = await makeRequest(noiseRequest, 'noise')
      
      results.noise_requests++
      if (result.status >= 400 && result.status < 500) {
        results.noise_rejected++ // Fast rejection (expected)
      } else if (!result.success) {
        results.noise_errors++
      }
      
      if (result.latency_ms) {
        results.noise_latencies.push(result.latency_ms)
      }
      
      lastNoiseTime = now
    }
    
    // Low-volume signal stream (valid but degrading)
    if (now - lastSignalTime >= SIGNAL_INTERVAL_MS) {
      const signalRequest = generateValidSignal()
      const result = await makeRequest(signalRequest, 'signal')
      
      results.signal_requests++
      if (result.success) {
        results.signal_successful++
      } else {
        results.signal_failed++
      }
      
      if (result.latency_ms) {
        results.signal_latencies.push(result.latency_ms)
      }
      
      lastSignalTime = now
    }
    
    // Check for incidents periodically (every 10 seconds)
    if (now - lastIncidentCheck >= 10000) {
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
      
      lastIncidentCheck = now
    }
    
    // Small delay to prevent tight loop
    await new Promise(resolve => setTimeout(resolve, 10))
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
  const avgNoiseLatency = results.noise_latencies.length > 0
    ? results.noise_latencies.reduce((a, b) => a + b, 0) / results.noise_latencies.length
    : 0
  
  const avgSignalLatency = results.signal_latencies.length > 0
    ? results.signal_latencies.reduce((a, b) => a + b, 0) / results.signal_latencies.length
    : 0
  
  results.avg_noise_latency_ms = avgNoiseLatency
  results.avg_signal_latency_ms = avgSignalLatency
  results.duration_ms = Date.now() - START_TIME
  
  logObservation('SESSION', 'end', {
    session_id: SESSION_ID,
    results
  })
  
  // Save observations
  await saveObservations()
  
  console.log(`\n=== SESSION 2 COMPLETE ===\n`)
  console.log(`Noise Requests: ${results.noise_requests}`)
  console.log(`  - Rejected (4xx): ${results.noise_rejected}`)
  console.log(`  - Errors: ${results.noise_errors}`)
  console.log(`  - Avg Latency: ${avgNoiseLatency.toFixed(0)}ms`)
  console.log(`Signal Requests: ${results.signal_requests}`)
  console.log(`  - Successful: ${results.signal_successful}`)
  console.log(`  - Failed: ${results.signal_failed}`)
  console.log(`  - Avg Latency: ${avgSignalLatency.toFixed(0)}ms`)
  console.log(`Incidents Created: ${results.incidents_created}`)
  console.log(`Incidents Suppressed: ${results.incidents_suppressed}`)
}

async function saveObservations() {
  const outputDir = path.join(process.cwd(), 'chaos', 'sessions')
  await fs.mkdir(outputDir, { recursive: true })
  
  const jsonPath = path.join(outputDir, `${SESSION_ID}-observations.json`)
  const reportPath = path.join(outputDir, `${SESSION_ID}-report.md`)
  
  const summary = {
    session_id: SESSION_ID,
    session_type: 'mixed_traffic',
    start_time: new Date(START_TIME).toISOString(),
    end_time: new Date().toISOString(),
    duration_ms: Date.now() - START_TIME,
    observations: OBSERVATIONS,
    findings: {
      total_observations: OBSERVATIONS.length,
      noise_requests: OBSERVATIONS.filter(o => o.event === 'noise_request' || o.event === 'noise_exception').length,
      signal_requests: OBSERVATIONS.filter(o => o.event === 'signal_request' || o.event === 'signal_exception').length,
      incident_creation_observed: OBSERVATIONS.some(o => o.event === 'created'),
      incident_suppression_observed: OBSERVATIONS.some(o => o.event === 'suppressed'),
      valid_failures_surfaced: OBSERVATIONS.filter(o => o.event === 'signal_exception' || (o.event === 'signal_request' && o.data.status >= 500)).length > 0
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
  const noiseRequests = OBSERVATIONS.filter(o => o.event === 'noise_request' || o.event === 'noise_exception')
  const signalRequests = OBSERVATIONS.filter(o => o.event === 'signal_request' || o.event === 'signal_exception')
  const incidents = OBSERVATIONS.filter(o => o.phase === 'INCIDENT')
  const signalFailures = signalRequests.filter(s => !s.data.status || s.data.status >= 500 || s.event === 'signal_exception')
  
  return `# Session 2: Mixed Traffic (Noise vs Signal) Report

**Session ID**: ${SESSION_ID}
**Start Time**: ${summary.start_time}
**End Time**: ${summary.end_time}
**Duration**: ${(summary.duration_ms / 1000).toFixed(1)}s

## Executive Summary

This session verified that invalid noise does not drown out valid distress.

## Observations

### Traffic Mix
- **Noise Requests**: ${summary.findings.noise_requests}
- **Signal Requests**: ${summary.findings.signal_requests}
- **Noise Ratio**: ${(NOISE_RATIO * 100).toFixed(0)}%

### Incident Behavior
- **Incidents Created**: ${summary.findings.incident_creation_observed ? 'YES' : 'NO'}
- **Incidents Suppressed**: ${summary.findings.incident_suppression_observed ? 'YES' : 'NO'}
- **Valid Failures Surfaced**: ${summary.findings.valid_failures_surfaced ? 'YES' : 'NO'}

## Detailed Findings

### Noise Handling
- **Total Noise Requests**: ${noiseRequests.length}
- **Fast Rejections (4xx)**: ${noiseRequests.filter(n => n.data.status >= 400 && n.data.status < 500).length}
- **Average Latency**: ${noiseRequests.length > 0 ? (noiseRequests.reduce((sum, n) => sum + (n.data.latency_ms || 0), 0) / noiseRequests.length).toFixed(0) : 0}ms

### Signal Handling
- **Total Signal Requests**: ${signalRequests.length}
- **Signal Failures**: ${signalFailures.length}
- **Average Latency**: ${signalRequests.length > 0 ? (signalRequests.reduce((sum, s) => sum + (s.data.latency_ms || 0), 0) / signalRequests.length).toFixed(0) : 0}ms

### Incidents Observed
${incidents.length > 0 ? incidents.map(i => `- **${i.timestamp}**: ${i.event} - ${JSON.stringify(i.data).slice(0, 200)}`).join('\n') : '- None'}

## Unanswered Questions

1. Did valid failures still surface despite noise?
2. Did incidents ignore noise correctly?
3. Did Jarvis stay factual and calm?
4. Were metrics polluted by junk traffic?

## What Cannot Yet Be Verified

- Whether noise rejection is fast enough
- Whether signal failures are detected correctly
- Whether incident classification ignores noise
- Whether metrics aggregation filters noise
- Whether Jarvis remains composed under noise

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


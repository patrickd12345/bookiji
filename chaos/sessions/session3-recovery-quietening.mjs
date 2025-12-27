#!/usr/bin/env node
/**
 * SESSION 3 — RECOVERY & QUIETENING
 * 
 * Objective: Test whether the system gets quieter after stress.
 * 
 * OBSERVATION MODE ONLY — NO FIXES
 */

import fs from 'fs/promises'
import path from 'path'

const SESSION_ID = `session3-${Date.now()}`
const OBSERVATIONS = []
const START_TIME = Date.now()

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const STRESS_DURATION_MS = 2 * 60 * 1000 // 2 minutes of stress
const RECOVERY_DURATION_MS = 60 * 1000 // 60 seconds of recovery observation
const CHECK_INTERVAL_MS = 5000 // Check every 5 seconds

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
 * Create stress (valid booking requests that may fail)
 */
async function createStress() {
  const now = new Date()
  const startTime = new Date(now.getTime() + 60 * 60 * 1000)
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000)
  
  const payload = {
    providerId: 'test-provider-id',
    serviceId: 'test-service-id',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    amountUSD: 50.00
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/bookings/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    })
    
    const text = await response.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }
    
    return {
      success: response.ok,
      status: response.status,
      response: json
    }
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message
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
      snapshot_env: data.snapshot?.env,
      snapshot_signals: data.snapshot?.signals
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
 * Check system health
 */
async function checkHealth() {
  try {
    // Try a simple health check endpoint or basic API call
    const response = await fetch(`${BASE_URL}/api/jarvis/detect`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    })
    
    const latency = Date.now()
    await response.json()
    const responseTime = Date.now() - latency
    
    return {
      healthy: response.ok,
      latency_ms: responseTime
    }
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    }
  }
}

/**
 * Main session execution
 */
async function runSession() {
  console.log(`\n=== SESSION 3: RECOVERY & QUIETENING ===\n`)
  console.log(`Stress Duration: ${STRESS_DURATION_MS / 1000}s`)
  console.log(`Recovery Observation: ${RECOVERY_DURATION_MS / 1000}s`)
  console.log(`Base URL: ${BASE_URL}\n`)
  
  logObservation('SESSION', 'start', {
    session_id: SESSION_ID,
    stress_duration_ms: STRESS_DURATION_MS,
    recovery_duration_ms: RECOVERY_DURATION_MS,
    base_url: BASE_URL
  })
  
  const results = {
    stress_phase: {
      requests: 0,
      successful: 0,
      failed: 0,
      incidents_created: 0,
      incidents_suppressed: 0
    },
    recovery_phase: {
      requests: 0,
      successful: 0,
      failed: 0,
      incidents_created: 0,
      incidents_suppressed: 0,
      lingering_alerts: 0,
      ghost_activity: []
    },
    timeline: []
  }
  
  // PHASE 1: STRESS
  console.log('\n--- PHASE 1: STRESS ---\n')
  logObservation('PHASE', 'stress_start', {})
  
  const stressEndTime = Date.now() + STRESS_DURATION_MS
  let lastRequestTime = 0
  let lastCheckTime = 0
  
  while (Date.now() < stressEndTime) {
    const now = Date.now()
    
    // Create stress requests every 2 seconds
    if (now - lastRequestTime >= 2000) {
      const result = await createStress()
      results.stress_phase.requests++
      if (result.success) {
        results.stress_phase.successful++
      } else {
        results.stress_phase.failed++
      }
      lastRequestTime = now
    }
    
    // Check for incidents every 5 seconds
    if (now - lastCheckTime >= CHECK_INTERVAL_MS) {
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
            results.stress_phase.incidents_created++
          }
        } else {
          // Just log observation (local mode)
          results.stress_phase.incidents_created++
          logObservation('INCIDENT', 'would_create_during_stress', {
            reason: incidentCheck.reason,
            snapshot: incidentCheck.snapshot,
            mode: 'local_observation'
          })
        }
      } else if (incidentCheck && !incidentCheck.should_alert) {
        results.stress_phase.incidents_suppressed++
        logObservation('INCIDENT', 'suppressed_during_stress', {
          reason: incidentCheck.reason
        })
      }
      
      // Record timeline point
      results.timeline.push({
        elapsed_ms: now - START_TIME,
        phase: 'stress',
        incident_status: incidentCheck?.should_alert ? 'alert' : 'quiet',
        health: await checkHealth()
      })
      
      lastCheckTime = now
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  logObservation('PHASE', 'stress_end', {
    requests: results.stress_phase.requests,
    successful: results.stress_phase.successful,
    failed: results.stress_phase.failed,
    incidents_created: results.stress_phase.incidents_created
  })
  
  // PHASE 2: GRADUAL REMOVAL OF STRESSORS
  console.log('\n--- PHASE 2: GRADUAL RECOVERY ---\n')
  logObservation('PHASE', 'recovery_start', {})
  
  // Stop creating stress, but continue observing
  const recoveryEndTime = Date.now() + RECOVERY_DURATION_MS
  let recoveryCheckTime = Date.now()
  
  while (Date.now() < recoveryEndTime) {
    const now = Date.now()
    
    // Check for incidents every 5 seconds
    if (now - recoveryCheckTime >= CHECK_INTERVAL_MS) {
      const incidentCheck = await checkIncidents()
      const health = await checkHealth()
      
      if (incidentCheck?.should_alert) {
        // In STAGING mode, create real incident
        const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'local'
        const IS_STAGING = APP_ENV === 'staging'
        const ENABLE_STAGING_INCIDENTS = process.env.ENABLE_STAGING_INCIDENTS === 'true'
        
        if (IS_STAGING && ENABLE_STAGING_INCIDENTS) {
          const createResult = await createIncident()
          if (createResult?.incident_id) {
            results.recovery_phase.incidents_created++
            results.recovery_phase.lingering_alerts++
          }
        } else {
          results.recovery_phase.incidents_created++
          results.recovery_phase.lingering_alerts++
        }
        
        logObservation('INCIDENT', 'lingering_alert', {
          reason: incidentCheck.reason,
          snapshot: incidentCheck.snapshot,
          elapsed_since_stress_end: now - stressEndTime
        })
      } else if (incidentCheck && !incidentCheck.should_alert) {
        results.recovery_phase.incidents_suppressed++
        logObservation('INCIDENT', 'quietening', {
          reason: incidentCheck.reason,
          elapsed_since_stress_end: now - stressEndTime
        })
      }
      
      // Check for ghost activity (unexpected incidents after stress)
      if (incidentCheck?.should_alert && (now - stressEndTime) > 30000) {
        results.recovery_phase.ghost_activity.push({
          timestamp: new Date().toISOString(),
          elapsed_ms: now - stressEndTime,
          incident: incidentCheck
        })
        logObservation('GHOST_ACTIVITY', 'detected', {
          elapsed_since_stress_end: now - stressEndTime,
          incident: incidentCheck
        })
      }
      
      // Record timeline point
      results.timeline.push({
        elapsed_ms: now - START_TIME,
        phase: 'recovery',
        incident_status: incidentCheck?.should_alert ? 'alert' : 'quiet',
        health
      })
      
      recoveryCheckTime = now
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  logObservation('PHASE', 'recovery_end', {
    lingering_alerts: results.recovery_phase.lingering_alerts,
    ghost_activity_count: results.recovery_phase.ghost_activity.length
  })
  
  // PHASE 3: FINAL OBSERVATION (complete silence)
  console.log('\n--- PHASE 3: FINAL OBSERVATION (60s silence) ---\n')
  logObservation('PHASE', 'silence_start', {})
  
  const silenceEndTime = Date.now() + 60000 // 60 seconds
  let silenceCheckTime = Date.now()
  
  while (Date.now() < silenceEndTime) {
    const now = Date.now()
    
    // Check every 10 seconds during silence
    if (now - silenceCheckTime >= 10000) {
      const incidentCheck = await checkIncidents()
      const health = await checkHealth()
      
      if (incidentCheck?.should_alert) {
        logObservation('SILENCE', 'unexpected_alert', {
          reason: incidentCheck.reason,
          elapsed_since_stress_end: now - stressEndTime
        })
      } else {
        logObservation('SILENCE', 'quiet', {
          elapsed_since_stress_end: now - stressEndTime
        })
      }
      
      results.timeline.push({
        elapsed_ms: now - START_TIME,
        phase: 'silence',
        incident_status: incidentCheck?.should_alert ? 'alert' : 'quiet',
        health
      })
      
      silenceCheckTime = now
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  logObservation('PHASE', 'silence_end', {})
  
  // Final checks
  console.log('\n--- Final Checks ---\n')
  const finalIncidentCheck = await checkIncidents()
  const finalHealth = await checkHealth()
  
  logObservation('FINAL', 'incident_status', {
    should_alert: finalIncidentCheck?.should_alert,
    reason: finalIncidentCheck?.reason,
    health: finalHealth
  })
  
  // In STAGING, create final incident if needed
  const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'local'
  const IS_STAGING = APP_ENV === 'staging'
  const ENABLE_STAGING_INCIDENTS = process.env.ENABLE_STAGING_INCIDENTS === 'true'
  
  if (IS_STAGING && ENABLE_STAGING_INCIDENTS && finalIncidentCheck?.should_alert) {
    await createIncident()
  }
  
  results.duration_ms = Date.now() - START_TIME
  results.final_status = {
    incident_should_alert: finalIncidentCheck?.should_alert,
    health: finalHealth
  }
  
  logObservation('SESSION', 'end', {
    session_id: SESSION_ID,
    results
  })
  
  // Save observations
  await saveObservations()
  
  console.log(`\n=== SESSION 3 COMPLETE ===\n`)
  console.log(`Stress Phase:`)
  console.log(`  - Requests: ${results.stress_phase.requests}`)
  console.log(`  - Failed: ${results.stress_phase.failed}`)
  console.log(`  - Incidents Created: ${results.stress_phase.incidents_created}`)
  console.log(`Recovery Phase:`)
  console.log(`  - Lingering Alerts: ${results.recovery_phase.lingering_alerts}`)
  console.log(`  - Ghost Activity: ${results.recovery_phase.ghost_activity.length}`)
  console.log(`Final Status:`)
  console.log(`  - Should Alert: ${finalIncidentCheck?.should_alert ? 'YES' : 'NO'}`)
  console.log(`  - Health: ${finalHealth.healthy ? 'HEALTHY' : 'UNHEALTHY'}`)
}

async function saveObservations() {
  const outputDir = path.join(process.cwd(), 'chaos', 'sessions')
  await fs.mkdir(outputDir, { recursive: true })
  
  const jsonPath = path.join(outputDir, `${SESSION_ID}-observations.json`)
  const reportPath = path.join(outputDir, `${SESSION_ID}-report.md`)
  
  const summary = {
    session_id: SESSION_ID,
    session_type: 'recovery_quietening',
    start_time: new Date(START_TIME).toISOString(),
    end_time: new Date().toISOString(),
    duration_ms: Date.now() - START_TIME,
    observations: OBSERVATIONS,
    findings: {
      total_observations: OBSERVATIONS.length,
      stress_incidents: OBSERVATIONS.filter(o => o.phase === 'PHASE' && o.event === 'created_during_stress').length,
      recovery_incidents: OBSERVATIONS.filter(o => o.phase === 'INCIDENT' && o.event === 'lingering_alert').length,
      ghost_activity: OBSERVATIONS.filter(o => o.event === 'detected').length,
      quietening_observed: OBSERVATIONS.filter(o => o.event === 'quietening').length,
      final_quiet: !OBSERVATIONS.slice(-5).some(o => o.event === 'unexpected_alert')
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
  const stressIncidents = OBSERVATIONS.filter(o => o.event === 'created_during_stress')
  const recoveryIncidents = OBSERVATIONS.filter(o => o.event === 'lingering_alert')
  const ghostActivity = OBSERVATIONS.filter(o => o.event === 'detected')
  const quietening = OBSERVATIONS.filter(o => o.event === 'quietening')
  const silence = OBSERVATIONS.filter(o => o.phase === 'SILENCE')
  
  return `# Session 3: Recovery & Quietening Report

**Session ID**: ${SESSION_ID}
**Start Time**: ${summary.start_time}
**End Time**: ${summary.end_time}
**Duration**: ${(summary.duration_ms / 1000).toFixed(1)}s

## Executive Summary

This session tested whether the system gets quieter after stress.

## Observations

### Stress Phase
- **Incidents Created**: ${stressIncidents.length}
- **Incidents Suppressed**: ${OBSERVATIONS.filter(o => o.event === 'suppressed_during_stress').length}

### Recovery Phase
- **Lingering Alerts**: ${recoveryIncidents.length}
- **Ghost Activity**: ${ghostActivity.length}
- **Quietening Events**: ${quietening.length}

### Silence Phase
- **Unexpected Alerts**: ${silence.filter(s => s.event === 'unexpected_alert').length}
- **Quiet Periods**: ${silence.filter(s => s.event === 'quiet').length}

## Detailed Findings

### Incident Resolution Behavior
${recoveryIncidents.length > 0 ? recoveryIncidents.map(i => `- **${i.timestamp}**: ${JSON.stringify(i.data).slice(0, 200)}`).join('\n') : '- No lingering alerts observed'}

### Ghost Activity
${ghostActivity.length > 0 ? ghostActivity.map(g => `- **${g.timestamp}**: ${JSON.stringify(g.data).slice(0, 200)}`).join('\n') : '- No ghost activity observed'}

### Quietening Behavior
${quietening.length > 0 ? quietening.map(q => `- **${q.timestamp}**: ${JSON.stringify(q.data).slice(0, 200)}`).join('\n') : '- No quietening events observed'}

## Unanswered Questions

1. Did incidents resolve cleanly after stress?
2. Were there lingering alerts?
3. Did Jarvis de-escalate cleanly?
4. Was there any ghost activity?

## What Cannot Yet Be Verified

- Whether incident resolution is automatic
- Whether suppression windows are appropriate
- Whether de-escalation logic works correctly
- Whether ghost activity indicates bugs
- Whether quietening is consistent

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


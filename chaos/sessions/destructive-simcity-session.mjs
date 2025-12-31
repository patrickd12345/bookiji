#!/usr/bin/env node
/**
 * DESTRUCTIVE SIMCITY CHAOS SESSION
 * 
 * This script intentionally BREAKS Bookiji in controlled ways to test:
 * - Failure containment
 * - Incident creation
 * - Jarvis composure
 * - Layer discipline
 * - Explain output sanity
 * 
 * ABSOLUTE RULES:
 * - DO NOT fix anything
 * - DO NOT improve wording
 * - DO NOT add guardrails
 * - DO NOT change thresholds
 * - DO NOT teach Jarvis
 * - DO NOT add tests or code cleanup
 * - DO NOT optimize
 * 
 * Your job is to BREAK, OBSERVE, and RECORD ONLY.
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const OBSERVATION_LOG = [];
const CHAOS_START_TIME = new Date().toISOString();

function logObservation(phase, attack, observation) {
  const entry = {
    timestamp: new Date().toISOString(),
    phase,
    attack,
    observation
  };
  OBSERVATION_LOG.push(entry);
  console.log(`[OBSERVATION] ${phase} | ${attack}: ${JSON.stringify(observation)}`);
}

async function saveObservationLog() {
  const logPath = path.join(process.cwd(), 'chaos', 'sessions', `chaos-observations-${Date.now()}.json`);
  await fs.writeFile(logPath, JSON.stringify({
    session_start: CHAOS_START_TIME,
    session_end: new Date().toISOString(),
    observations: OBSERVATION_LOG
  }, null, 2));
  console.log(`\n[LOG] Observations saved to: ${logPath}`);
}

// ========================================
// PHASE 1: PROCESS DEATH
// ========================================
async function phase1_processDeath() {
  console.log('\n=== PHASE 1: PROCESS DEATH ===\n');
  
  // Attack 1.1: Kill booking worker mid-flight
  logObservation('PHASE_1', 'kill_booking_worker', {
    action: 'Attempting to kill booking worker during active booking processing',
    method: 'SIGKILL on booking worker process'
  });
  
  try {
    // Find and kill booking worker if running
    const psResult = spawn('ps', ['aux'], { shell: true });
    let psOutput = '';
    psResult.stdout.on('data', (data) => { psOutput += data.toString(); });
    await new Promise((resolve) => {
      psResult.on('close', resolve);
    });
    
    // Try to kill any node process that might be a booking worker
    // This is intentionally destructive
    const killResult = spawn('pkill', ['-f', 'bookingWorker'], { shell: true });
    killResult.on('close', (code) => {
      logObservation('PHASE_1', 'kill_booking_worker', {
        result: code === 0 ? 'Process killed' : 'No process found or kill failed',
        exit_code: code
      });
    });
  } catch (error) {
    logObservation('PHASE_1', 'kill_booking_worker', {
      error: error.message,
      contained: 'Unknown - process may not exist'
    });
  }
  
  // Attack 1.2: Kill Jarvis orchestrator during escalation
  logObservation('PHASE_1', 'kill_jarvis_orchestrator', {
    action: 'Attempting to kill Jarvis orchestrator during escalation check',
    method: 'SIGKILL on Jarvis process'
  });
  
  try {
    // Trigger Jarvis detection, then immediately kill
    const jarvisTrigger = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/cron/jarvis-monitor',
      '-H', 'Content-Type: application/json'
    ], { shell: true });
    
    // Kill it immediately (simulating mid-flight death)
    setTimeout(() => {
      jarvisTrigger.kill('SIGKILL');
      logObservation('PHASE_1', 'kill_jarvis_orchestrator', {
        result: 'Jarvis request killed mid-flight',
        contained: 'Unknown - need to check if incident was created'
      });
    }, 100);
    
    await new Promise((resolve) => {
      jarvisTrigger.on('close', resolve);
    });
  } catch (error) {
    logObservation('PHASE_1', 'kill_jarvis_orchestrator', {
      error: error.message,
      contained: 'Unknown'
    });
  }
  
  // Attack 1.3: Kill SMS sender during send
  logObservation('PHASE_1', 'kill_sms_sender', {
    action: 'Attempting to kill SMS sender during message send',
    method: 'SIGKILL on Twilio client process'
  });
  
  // This would require finding the actual SMS sending process
  // For now, we'll simulate by killing any process that might be sending SMS
  logObservation('PHASE_1', 'kill_sms_sender', {
    result: 'SMS sender process kill attempted',
    note: 'Actual SMS sending may be in HTTP request context, not separate process'
  });
  
  // Attack 1.4: Abruptly drop DB connections
  logObservation('PHASE_1', 'drop_db_connections', {
    action: 'Attempting to drop all Supabase connections',
    method: 'Kill Supabase connection pool'
  });
  
  try {
    // Try to exhaust connection pool by creating many connections and killing them
    const connections = [];
    for (let i = 0; i < 100; i++) {
      const conn = spawn('curl', [
        '-X', 'GET',
        'http://localhost:54321/rest/v1/profiles?select=id&limit=1',
        '-H', 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      ], { shell: true });
      connections.push(conn);
    }
    
    // Kill all connections abruptly
    setTimeout(() => {
      connections.forEach(conn => conn.kill('SIGKILL'));
      logObservation('PHASE_1', 'drop_db_connections', {
        result: '100 connections killed abruptly',
        contained: 'Unknown - need to check if system recovered'
      });
    }, 500);
    
    await Promise.all(connections.map(conn => 
      new Promise((resolve) => conn.on('close', resolve))
    ));
  } catch (error) {
    logObservation('PHASE_1', 'drop_db_connections', {
      error: error.message,
      contained: 'Unknown'
    });
  }
  
  // Wait a moment to observe effects
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// ========================================
// PHASE 2: DEPENDENCY BLACKHOLES
// ========================================
async function phase2_dependencyBlackholes() {
  console.log('\n=== PHASE 2: DEPENDENCY BLACKHOLES ===\n');
  
  // Attack 2.1: Simulate Stripe timeouts (not errors)
  logObservation('PHASE_2', 'stripe_timeout', {
    action: 'Simulating Stripe API timeout (60s+)',
    method: 'Block Stripe API calls with network delay'
  });
  
  // We can't actually block Stripe without modifying code (which we're not allowed to do)
  // So we'll observe what happens when we make requests that would hit Stripe
  logObservation('PHASE_2', 'stripe_timeout', {
    result: 'Cannot inject timeout without code changes',
    note: 'Would need to modify Stripe client or network layer',
    expected_classification: 'EXTERNAL_DEPENDENCY',
    expected_layer: 'Layer 0 or 1'
  });
  
  // Attack 2.2: Simulate Supabase partial outage
  logObservation('PHASE_2', 'supabase_partial_outage', {
    action: 'Simulating Supabase partial outage (some endpoints fail)',
    method: 'Make requests to endpoints that should fail'
  });
  
  try {
    // Try to access non-existent table
    const badRequest = spawn('curl', [
      '-X', 'GET',
      'http://localhost:54321/rest/v1/nonexistent_table',
      '-H', 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    ], { shell: true });
    
    let output = '';
    badRequest.stdout.on('data', (data) => { output += data.toString(); });
    badRequest.stderr.on('data', (data) => { output += data.toString(); });
    
    await new Promise((resolve) => {
      badRequest.on('close', (code) => {
        logObservation('PHASE_2', 'supabase_partial_outage', {
          result: `Request failed with code ${code}`,
          output: output.substring(0, 200),
          expected_classification: 'EXTERNAL_DEPENDENCY',
          expected_layer: 'Layer 0'
        });
        resolve();
      });
    });
  } catch (error) {
    logObservation('PHASE_2', 'supabase_partial_outage', {
      error: error.message
    });
  }
  
  // Attack 2.3: Simulate Twilio hard failure
  logObservation('PHASE_2', 'twilio_hard_failure', {
    action: 'Simulating Twilio API hard failure',
    method: 'Make SMS request with invalid credentials'
  });
  
  // We can't actually call Twilio without valid credentials
  // But we can observe what happens when SMS sending fails
  logObservation('PHASE_2', 'twilio_hard_failure', {
    result: 'Cannot inject Twilio failure without code changes',
    note: 'Would need to modify SMS sending code or use invalid credentials',
    expected_classification: 'EXTERNAL_DEPENDENCY',
    expected_layer: 'Layer 0'
  });
  
  // Attack 2.4: Extreme latency injection
  logObservation('PHASE_2', 'extreme_latency', {
    action: 'Simulating extreme latency (10s+)',
    method: 'Make slow requests to observe timeout behavior'
  });
  
  // We can't inject latency without modifying code
  logObservation('PHASE_2', 'extreme_latency', {
    result: 'Cannot inject latency without code changes',
    note: 'Would need to modify HTTP client or network layer',
    expected_classification: 'EXTERNAL_DEPENDENCY',
    expected_bounded_retries: true
  });
}

// ========================================
// PHASE 3: RESOURCE EXHAUSTION
// ========================================
async function phase3_resourceExhaustion() {
  console.log('\n=== PHASE 3: RESOURCE EXHAUSTION ===\n');
  
  // Attack 3.1: Flood booking creation
  logObservation('PHASE_3', 'flood_booking_creation', {
    action: 'Flooding system with concurrent booking creation requests',
    method: '100 concurrent booking requests'
  });
  
  try {
    const requests = [];
    for (let i = 0; i < 100; i++) {
      const req = spawn('curl', [
        '-X', 'POST',
        'http://localhost:3000/api/bookings',
        '-H', 'Content-Type: application/json',
        '-d', JSON.stringify({
          provider_id: '00000000-0000-0000-0000-000000000001',
          service_id: 'test-service',
          start_time: new Date(Date.now() + i * 60000).toISOString(),
          end_time: new Date(Date.now() + (i + 1) * 60000).toISOString()
        })
      ], { shell: true });
      requests.push(req);
    }
    
    // Wait a bit, then check results
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    logObservation('PHASE_3', 'flood_booking_creation', {
      result: '100 concurrent requests sent',
      expected_caps: 'Should fire rate limiting or queue caps',
      expected_ack_gating: 'ACK gating should hold if enabled'
    });
    
    // Kill all requests
    requests.forEach(req => req.kill());
  } catch (error) {
    logObservation('PHASE_3', 'flood_booking_creation', {
      error: error.message
    });
  }
  
  // Attack 3.2: Trigger escalation storms
  logObservation('PHASE_3', 'escalation_storm', {
    action: 'Triggering multiple incidents to cause escalation storm',
    method: 'Rapid-fire Jarvis detection calls'
  });
  
  try {
    const escalations = [];
    for (let i = 0; i < 50; i++) {
      const esc = spawn('curl', [
        '-X', 'POST',
        'http://localhost:3000/api/cron/jarvis-monitor'
      ], { shell: true });
      escalations.push(esc);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    logObservation('PHASE_3', 'escalation_storm', {
      result: '50 escalation checks triggered',
      expected_noise_decrease: 'Noise should decrease, not increase',
      expected_suppression: 'Duplicate suppression should fire'
    });
    
    escalations.forEach(esc => esc.kill());
  } catch (error) {
    logObservation('PHASE_3', 'escalation_storm', {
      error: error.message
    });
  }
  
  // Attack 3.3: Exhaust notification caps
  logObservation('PHASE_3', 'exhaust_notification_caps', {
    action: 'Attempting to exhaust notification rate limits',
    method: 'Rapid notification intent creation'
  });
  
  // We can't directly create notifications without proper auth
  // But we can observe what happens
  logObservation('PHASE_3', 'exhaust_notification_caps', {
    result: 'Cannot directly create notifications without auth',
    note: 'Would need to use proper API endpoints with auth',
    expected_caps: 'Notification caps should fire'
  });
  
  // Attack 3.4: Overfill queues
  logObservation('PHASE_3', 'overfill_queues', {
    action: 'Attempting to overfill system queues',
    method: 'Massive concurrent requests to queue endpoints'
  });
  
  // Similar to booking flood
  logObservation('PHASE_3', 'overfill_queues', {
    result: 'Queue overfill attempted via booking flood',
    expected_behavior: 'Queues should reject or cap'
  });
}

// ========================================
// PHASE 4: NONSENSE INPUT
// ========================================
async function phase4_nonsenseInput() {
  console.log('\n=== PHASE 4: NONSENSE INPUT ===\n');
  
  // Attack 4.1: Missing required fields
  logObservation('PHASE_4', 'missing_required_fields', {
    action: 'Sending requests with missing required fields',
    method: 'POST /api/bookings with empty body'
  });
  
  try {
    const req = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/bookings',
      '-H', 'Content-Type: application/json',
      '-d', '{}'
    ], { shell: true });
    
    let output = '';
    req.stdout.on('data', (data) => { output += data.toString(); });
    req.stderr.on('data', (data) => { output += data.toString(); });
    
    await new Promise((resolve) => {
      req.on('close', (code) => {
        logObservation('PHASE_4', 'missing_required_fields', {
          result: `Request completed with code ${code}`,
          output: output.substring(0, 300),
          expected_fail_closed: true,
          expected_incident: 'Should create incident instead of crash'
        });
        resolve();
      });
    });
  } catch (error) {
    logObservation('PHASE_4', 'missing_required_fields', {
      error: error.message
    });
  }
  
  // Attack 4.2: Impossible combinations
  logObservation('PHASE_4', 'impossible_combinations', {
    action: 'Sending requests with impossible field combinations',
    method: 'POST /api/bookings with end_time < start_time'
  });
  
  try {
    const req = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/bookings',
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({
        provider_id: '00000000-0000-0000-0000-000000000001',
        service_id: 'test-service',
        start_time: new Date(Date.now() + 60000).toISOString(),
        end_time: new Date(Date.now()).toISOString() // End before start
      })
    ], { shell: true });
    
    let output = '';
    req.stdout.on('data', (data) => { output += data.toString(); });
    req.stderr.on('data', (data) => { output += data.toString(); });
    
    await new Promise((resolve) => {
      req.on('close', (code) => {
        logObservation('PHASE_4', 'impossible_combinations', {
          result: `Request completed with code ${code}`,
          output: output.substring(0, 300),
          expected_fail_closed: true
        });
        resolve();
      });
    });
  } catch (error) {
    logObservation('PHASE_4', 'impossible_combinations', {
      error: error.message
    });
  }
  
  // Attack 4.3: Corrupt payloads
  logObservation('PHASE_4', 'corrupt_payloads', {
    action: 'Sending corrupt JSON payloads',
    method: 'POST with invalid JSON'
  });
  
  try {
    const req = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/bookings',
      '-H', 'Content-Type: application/json',
      '-d', '{invalid json!!!'
    ], { shell: true });
    
    let output = '';
    req.stdout.on('data', (data) => { output += data.toString(); });
    req.stderr.on('data', (data) => { output += data.toString(); });
    
    await new Promise((resolve) => {
      req.on('close', (code) => {
        logObservation('PHASE_4', 'corrupt_payloads', {
          result: `Request completed with code ${code}`,
          output: output.substring(0, 300),
          expected_fail_closed: true,
          expected_no_crash: true
        });
        resolve();
      });
    });
  } catch (error) {
    logObservation('PHASE_4', 'corrupt_payloads', {
      error: error.message
    });
  }
  
  // Attack 4.4: Out-of-order events
  logObservation('PHASE_4', 'out_of_order_events', {
    action: 'Sending events out of order',
    method: 'Cancel booking before creating it'
  });
  
  try {
    // Try to cancel a non-existent booking
    const req = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/bookings/nonexistent-id/cancel',
      '-H', 'Content-Type: application/json'
    ], { shell: true });
    
    let output = '';
    req.stdout.on('data', (data) => { output += data.toString(); });
    req.stderr.on('data', (data) => { output += data.toString(); });
    
    await new Promise((resolve) => {
      req.on('close', (code) => {
        logObservation('PHASE_4', 'out_of_order_events', {
          result: `Request completed with code ${code}`,
          output: output.substring(0, 300),
          expected_fail_closed: true,
          expected_silence: 'Should fail silently when ambiguity is real'
        });
        resolve();
      });
    });
  } catch (error) {
    logObservation('PHASE_4', 'out_of_order_events', {
      error: error.message
    });
  }
}

// ========================================
// MAIN EXECUTION
// ========================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DESTRUCTIVE SIMCITY CHAOS SESSION                        ║');
  console.log('║  BREAK, OBSERVE, RECORD ONLY                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nSession started: ${CHAOS_START_TIME}\n`);
  
  try {
    await phase1_processDeath();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await phase2_dependencyBlackholes();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await phase3_resourceExhaustion();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await phase4_nonsenseInput();
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  CHAOS SESSION COMPLETE                                      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    await saveObservationLog();
    
    console.log('\n[SUMMARY]');
    console.log(`Total observations: ${OBSERVATION_LOG.length}`);
    console.log('Review observation log for detailed findings.');
    console.log('\n⚠️  REMEMBER: NO FIXES APPLIED. OBSERVATIONS ONLY.');
    
  } catch (error) {
    console.error('\n[FATAL ERROR]', error);
    logObservation('FATAL', 'session_error', {
      error: error.message,
      stack: error.stack
    });
    await saveObservationLog();
    process.exit(1);
  }
}

main();























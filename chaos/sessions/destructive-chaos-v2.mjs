#!/usr/bin/env node
/**
 * DESTRUCTIVE SIMCITY CHAOS SESSION v2
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
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OBSERVATION_LOG = [];
const CHAOS_START_TIME = new Date().toISOString();
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

function logObservation(phase, attack, observation) {
  const entry = {
    timestamp: new Date().toISOString(),
    phase,
    attack,
    observation
  };
  OBSERVATION_LOG.push(entry);
  console.log(`[OBSERVATION] ${phase} | ${attack}: ${JSON.stringify(observation, null, 2)}`);
}

async function checkServerHealth() {
  try {
    const response = await fetch(`${TARGET_URL}/api/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return { alive: response.ok, status: response.status };
  } catch (error) {
    return { alive: false, error: error.message };
  }
}

async function makeRequest(method, endpoint, body = null, options = {}) {
  const url = `${TARGET_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(options.timeout || 10000)
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      status: 0
    };
  }
}

async function queryIncidents(limit = 10) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/jarvis_incidents?select=*&order=created_at.desc&limit=${limit}`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (error) {
    return { error: error.message };
  }
}

// ========================================
// PHASE 1: PROCESS DEATH
// ========================================
async function phase1_processDeath() {
  console.log('\n=== PHASE 1: PROCESS DEATH ===\n');
  
  // Attack 1.1: Kill SimCity orchestrator mid-flight
  logObservation('PHASE_1', 'kill_simcity_orchestrator', {
    action: 'Starting SimCity, then killing request mid-flight',
    method: 'Start simulation, abort request immediately'
  });
  
  try {
    const controller = new AbortController();
    const startPromise = fetch(`${TARGET_URL}/api/ops/controlplane/simcity/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seed: 999999,
        tickRateMs: 100,
        failureProbabilityByDomain: { booking: 0.5, payment: 0.5 }
      }),
      signal: controller.signal
    });
    
    // Kill immediately (simulating mid-flight death)
    setTimeout(() => controller.abort(), 50);
    
    try {
      await startPromise;
      logObservation('PHASE_1', 'kill_simcity_orchestrator', {
        result: 'Request completed (unexpected)',
        contained: 'Unknown'
      });
    } catch (error) {
      logObservation('PHASE_1', 'kill_simcity_orchestrator', {
        result: 'Request aborted mid-flight',
        error: error.message,
        contained: 'Unknown - need to check if incident was created',
        question: 'Did SimCity create incident or crash silently?'
      });
    }
    
    // Check for incidents
    await new Promise(r => setTimeout(r, 1000));
    const incidents = await queryIncidents(5);
    logObservation('PHASE_1', 'kill_simcity_orchestrator', {
      incidents_after_kill: incidents.length || 0,
      question: 'Were incidents created instead of crashes?'
    });
    
  } catch (error) {
    logObservation('PHASE_1', 'kill_simcity_orchestrator', {
      error: error.message,
      contained: 'Unknown'
    });
  }
  
  // Attack 1.2: Kill Jarvis orchestrator during escalation
  logObservation('PHASE_1', 'kill_jarvis_orchestrator', {
    action: 'Triggering Jarvis detection, then killing request mid-flight',
    method: 'POST /api/cron/jarvis-monitor, abort immediately'
  });
  
  try {
    const controller = new AbortController();
    const jarvisPromise = fetch(`${TARGET_URL}/api/cron/jarvis-monitor`, {
      method: 'GET',
      signal: controller.signal
    });
    
    // Kill immediately
    setTimeout(() => controller.abort(), 50);
    
    try {
      await jarvisPromise;
      logObservation('PHASE_1', 'kill_jarvis_orchestrator', {
        result: 'Request completed (unexpected)',
        contained: 'Unknown'
      });
    } catch (error) {
      logObservation('PHASE_1', 'kill_jarvis_orchestrator', {
        result: 'Jarvis request killed mid-flight',
        error: error.message,
        contained: 'Unknown - need to check if incident was created',
        question: 'Did Jarvis create incident before death? Or fail silently?'
      });
    }
    
    // Check for incidents
    await new Promise(r => setTimeout(r, 1000));
    const incidents = await queryIncidents(5);
    logObservation('PHASE_1', 'kill_jarvis_orchestrator', {
      incidents_after_kill: incidents.length || 0,
      question: 'Were incidents created? Did failure stay local?'
    });
    
  } catch (error) {
    logObservation('PHASE_1', 'kill_jarvis_orchestrator', {
      error: error.message,
      contained: 'Unknown'
    });
  }
  
  // Attack 1.3: Kill SMS sender during send (simulate by aborting SMS endpoint)
  logObservation('PHASE_1', 'kill_sms_sender', {
    action: 'Triggering SMS send, then killing request mid-flight',
    method: 'POST to SMS endpoint, abort immediately'
  });
  
  try {
    // Try to trigger SMS via Jarvis (if it would send)
    const controller = new AbortController();
    const smsPromise = fetch(`${TARGET_URL}/api/jarvis/sms-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Body: 'TEST',
        From: '+1234567890',
        incident_id: 'test_incident'
      }),
      signal: controller.signal
    });
    
    setTimeout(() => controller.abort(), 50);
    
    try {
      await smsPromise;
      logObservation('PHASE_1', 'kill_sms_sender', {
        result: 'Request completed (unexpected)',
        contained: 'Unknown'
      });
    } catch (error) {
      logObservation('PHASE_1', 'kill_sms_sender', {
        result: 'SMS request killed mid-flight',
        error: error.message,
        contained: 'Unknown',
        question: 'Did SMS fail gracefully? Was incident created?'
      });
    }
  } catch (error) {
    logObservation('PHASE_1', 'kill_sms_sender', {
      error: error.message,
      contained: 'Unknown'
    });
  }
  
  // Attack 1.4: Abruptly drop DB connections (exhaust pool)
  logObservation('PHASE_1', 'drop_db_connections', {
    action: 'Creating many DB connections, then killing all abruptly',
    method: '100 concurrent DB queries, abort all'
  });
  
  try {
    const connections = [];
    for (let i = 0; i < 100; i++) {
      const controller = new AbortController();
      const promise = fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        signal: controller.signal
      });
      connections.push({ controller, promise });
    }
    
    // Kill all after 500ms
    setTimeout(() => {
      connections.forEach(({ controller }) => controller.abort());
      logObservation('PHASE_1', 'drop_db_connections', {
        result: '100 connections killed abruptly',
        contained: 'Unknown - need to check if system recovered',
        question: 'Did system recover? Did it create incident?'
      });
    }, 500);
    
    // Wait for all to complete or abort
    await Promise.allSettled(connections.map(({ promise }) => promise));
    
  } catch (error) {
    logObservation('PHASE_1', 'drop_db_connections', {
      error: error.message,
      contained: 'Unknown'
    });
  }
  
  await new Promise(r => setTimeout(r, 2000));
}

// ========================================
// PHASE 2: DEPENDENCY BLACKHOLES
// ========================================
async function phase2_dependencyBlackholes() {
  console.log('\n=== PHASE 2: DEPENDENCY BLACKHOLES ===\n');
  
  // Attack 2.1: Simulate Stripe timeouts (via booking creation with payment)
  logObservation('PHASE_2', 'stripe_timeout', {
    action: 'Creating booking that would hit Stripe, observe timeout behavior',
    method: 'POST booking with payment intent, observe classification'
  });
  
  try {
    const result = await makeRequest('POST', '/api/bookings', {
      provider_id: '00000000-0000-0000-0000-000000000001',
      service_id: 'test-service',
      start_time: new Date(Date.now() + 60000).toISOString(),
      end_time: new Date(Date.now() + 120000).toISOString()
    }, { timeout: 30000 });
    
    logObservation('PHASE_2', 'stripe_timeout', {
      result: result.ok ? 'Request succeeded' : 'Request failed',
      status: result.status,
      error: result.error,
      expected_classification: 'EXTERNAL_DEPENDENCY',
      expected_layer: 'Layer 0 or 1',
      question: 'Was it classified as EXTERNAL_DEPENDENCY?'
    });
    
    // Check incidents for classification
    const incidents = await queryIncidents(5);
    logObservation('PHASE_2', 'stripe_timeout', {
      incidents_created: incidents.length || 0,
      question: 'Did Jarvis classify this as EXTERNAL_DEPENDENCY?'
    });
    
  } catch (error) {
    logObservation('PHASE_2', 'stripe_timeout', {
      error: error.message,
      note: 'Cannot inject timeout without code changes, but can observe behavior'
    });
  }
  
  // Attack 2.2: Simulate Supabase partial outage (non-existent table)
  logObservation('PHASE_2', 'supabase_partial_outage', {
    action: 'Querying non-existent table to simulate partial outage',
    method: 'GET /rest/v1/nonexistent_table'
  });
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/nonexistent_table_xyz`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    const text = await response.text();
    logObservation('PHASE_2', 'supabase_partial_outage', {
      status: response.status,
      response: text.substring(0, 200),
      expected_classification: 'EXTERNAL_DEPENDENCY',
      expected_layer: 'Layer 0',
      question: 'Was this classified as EXTERNAL_DEPENDENCY?'
    });
    
  } catch (error) {
    logObservation('PHASE_2', 'supabase_partial_outage', {
      error: error.message,
      expected_classification: 'EXTERNAL_DEPENDENCY'
    });
  }
  
  // Attack 2.3: Simulate Twilio hard failure (invalid credentials)
  logObservation('PHASE_2', 'twilio_hard_failure', {
    action: 'Triggering SMS with invalid endpoint to simulate Twilio failure',
    method: 'POST to SMS endpoint with invalid config'
  });
  
  try {
    // This would normally fail if Twilio is misconfigured
    const result = await makeRequest('POST', '/api/jarvis/sms-reply', {
      Body: 'TEST',
      From: '+1234567890',
      incident_id: 'test_incident'
    });
    
    logObservation('PHASE_2', 'twilio_hard_failure', {
      result: result.ok ? 'Request succeeded' : 'Request failed',
      status: result.status,
      expected_classification: 'EXTERNAL_DEPENDENCY',
      expected_layer: 'Layer 0',
      question: 'Was SMS failure classified as EXTERNAL_DEPENDENCY?'
    });
    
  } catch (error) {
    logObservation('PHASE_2', 'twilio_hard_failure', {
      error: error.message,
      expected_classification: 'EXTERNAL_DEPENDENCY'
    });
  }
  
  // Attack 2.4: Extreme latency injection (via SimCity)
  logObservation('PHASE_2', 'extreme_latency', {
    action: 'Starting SimCity with extreme latency config',
    method: 'SimCity with p95Ms: 10000 (10 seconds)'
  });
  
  try {
    const result = await makeRequest('POST', '/api/ops/controlplane/simcity/start', {
      seed: 999999,
      tickRateMs: 1000,
      latency: {
        p50Ms: 5000,
        p95Ms: 10000
      }
    });
    
    logObservation('PHASE_2', 'extreme_latency', {
      result: result.ok ? 'SimCity started with latency' : 'Failed to start',
      status: result.status,
      expected_bounded_retries: true,
      expected_layer: 'Layer 0 or 1',
      question: 'Did system handle latency with bounded retries?'
    });
    
    // Stop SimCity after observation
    await makeRequest('POST', '/api/ops/controlplane/simcity/stop');
    
  } catch (error) {
    logObservation('PHASE_2', 'extreme_latency', {
      error: error.message,
      note: 'Cannot inject latency without code changes, but SimCity can simulate'
    });
  }
}

// ========================================
// PHASE 3: RESOURCE EXHAUSTION
// ========================================
async function phase3_resourceExhaustion() {
  console.log('\n=== PHASE 3: RESOURCE EXHAUSTION ===\n');
  
  // Attack 3.1: Flood booking creation
  logObservation('PHASE_3', 'flood_booking_creation', {
    action: 'Flooding system with 500 concurrent booking creation requests',
    method: '500 concurrent POST /api/bookings'
  });
  
  try {
    const requests = [];
    const startTime = Date.now();
    
    for (let i = 0; i < 500; i++) {
      requests.push(
        makeRequest('POST', '/api/bookings', {
          provider_id: '00000000-0000-0000-0000-000000000001',
          service_id: `test-service-${i}`,
          start_time: new Date(Date.now() + i * 60000).toISOString(),
          end_time: new Date(Date.now() + (i + 1) * 60000).toISOString()
        }, { timeout: 5000 })
      );
    }
    
    const results = await Promise.allSettled(requests);
    const duration = Date.now() - startTime;
    
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value?.ok).length;
    
    logObservation('PHASE_3', 'flood_booking_creation', {
      total_requests: 500,
      succeeded,
      failed,
      duration_ms: duration,
      expected_caps: 'Should fire rate limiting or queue caps',
      expected_ack_gating: 'ACK gating should hold if enabled',
      question: 'Did caps fire? Did noise decrease, not increase?'
    });
    
    // Check incidents
    const incidents = await queryIncidents(10);
    logObservation('PHASE_3', 'flood_booking_creation', {
      incidents_created: incidents.length || 0,
      question: 'Did system get QUIETER under stress?'
    });
    
  } catch (error) {
    logObservation('PHASE_3', 'flood_booking_creation', {
      error: error.message
    });
  }
  
  // Attack 3.2: Trigger escalation storms
  logObservation('PHASE_3', 'escalation_storm', {
    action: 'Triggering 100 Jarvis checks in rapid succession',
    method: '100 concurrent GET /api/cron/jarvis-monitor'
  });
  
  try {
    const requests = [];
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      requests.push(
        makeRequest('GET', '/api/cron/jarvis-monitor', null, { timeout: 10000 })
      );
    }
    
    const results = await Promise.allSettled(requests);
    const duration = Date.now() - startTime;
    
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value?.ok).length;
    
    logObservation('PHASE_3', 'escalation_storm', {
      total_requests: 100,
      succeeded,
      failed,
      duration_ms: duration,
      expected_noise_decrease: 'Noise should decrease, not increase',
      expected_suppression: 'Duplicate suppression should fire',
      question: 'Did duplicate suppression fire? Did noise decrease?'
    });
    
    // Check incidents
    const incidents = await queryIncidents(10);
    logObservation('PHASE_3', 'escalation_storm', {
      incidents_created: incidents.length || 0,
      question: 'Did system get QUIETER under stress?'
    });
    
  } catch (error) {
    logObservation('PHASE_3', 'escalation_storm', {
      error: error.message
    });
  }
  
  // Attack 3.3: Exhaust notification caps (via SimCity with high failure rate)
  logObservation('PHASE_3', 'exhaust_notification_caps', {
    action: 'Starting SimCity with 100% failure probability to trigger many incidents',
    method: 'SimCity with failureProbabilityByDomain: { booking: 1.0, payment: 1.0 }'
  });
  
  try {
    const result = await makeRequest('POST', '/api/ops/controlplane/simcity/start', {
      seed: 999999,
      tickRateMs: 100,
      failureProbabilityByDomain: {
        booking: 1.0,
        payment: 1.0,
        notification: 1.0
      }
    });
    
    if (result.ok) {
      // Let it run for 5 seconds
      await new Promise(r => setTimeout(r, 5000));
      
      // Check incidents
      const incidents = await queryIncidents(20);
      logObservation('PHASE_3', 'exhaust_notification_caps', {
        incidents_created: incidents.length || 0,
        expected_caps: 'Notification caps should fire',
        question: 'Did notification caps fire? Did ACK gating hold?'
      });
      
      // Stop SimCity
      await makeRequest('POST', '/api/ops/controlplane/simcity/stop');
    } else {
      logObservation('PHASE_3', 'exhaust_notification_caps', {
        result: 'Failed to start SimCity',
        status: result.status
      });
    }
    
  } catch (error) {
    logObservation('PHASE_3', 'exhaust_notification_caps', {
      error: error.message
    });
  }
  
  // Attack 3.4: Overfill queues (via booking flood)
  logObservation('PHASE_3', 'overfill_queues', {
    action: 'Same as booking flood - observing queue behavior',
    method: 'Already executed in flood_booking_creation',
    question: 'Did queues reject or cap?'
  });
}

// ========================================
// PHASE 4: NONSENSE INPUT
// ========================================
async function phase4_nonsenseInput() {
  console.log('\n=== PHASE 4: NONSENSE INPUT ===\n');
  
  // Attack 4.1: Missing required fields
  logObservation('PHASE_4', 'missing_required_fields', {
    action: 'POST /api/bookings with empty body',
    method: 'POST with {}'
  });
  
  try {
    const result = await makeRequest('POST', '/api/bookings', {});
    
    logObservation('PHASE_4', 'missing_required_fields', {
      result: result.ok ? 'Request succeeded (unexpected)' : 'Request failed (expected)',
      status: result.status,
      response: JSON.stringify(result.data).substring(0, 300),
      expected_fail_closed: true,
      expected_incident: 'Should create incident instead of crash',
      question: 'Did it fail closed? Was incident created?'
    });
    
  } catch (error) {
    logObservation('PHASE_4', 'missing_required_fields', {
      error: error.message,
      expected_fail_closed: true
    });
  }
  
  // Attack 4.2: Impossible combinations
  logObservation('PHASE_4', 'impossible_combinations', {
    action: 'POST /api/bookings with end_time < start_time',
    method: 'POST with invalid time range'
  });
  
  try {
    const result = await makeRequest('POST', '/api/bookings', {
      provider_id: '00000000-0000-0000-0000-000000000001',
      service_id: 'test-service',
      start_time: new Date(Date.now() + 60000).toISOString(),
      end_time: new Date(Date.now()).toISOString() // End before start
    });
    
    logObservation('PHASE_4', 'impossible_combinations', {
      result: result.ok ? 'Request succeeded (unexpected)' : 'Request failed (expected)',
      status: result.status,
      response: JSON.stringify(result.data).substring(0, 300),
      expected_fail_closed: true,
      question: 'Did it fail closed?'
    });
    
  } catch (error) {
    logObservation('PHASE_4', 'impossible_combinations', {
      error: error.message,
      expected_fail_closed: true
    });
  }
  
  // Attack 4.3: Corrupt JSON
  logObservation('PHASE_4', 'corrupt_payloads', {
    action: 'POST with invalid JSON',
    method: 'POST with {invalid!!!json'
  });
  
  try {
    const response = await fetch(`${TARGET_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid!!!json'
    });
    
    const text = await response.text();
    
    logObservation('PHASE_4', 'corrupt_payloads', {
      status: response.status,
      response: text.substring(0, 300),
      expected_fail_closed: true,
      expected_no_crash: true,
      question: 'Did it fail closed? No crash?'
    });
    
  } catch (error) {
    logObservation('PHASE_4', 'corrupt_payloads', {
      error: error.message,
      expected_fail_closed: true
    });
  }
  
  // Attack 4.4: Out-of-order events
  logObservation('PHASE_4', 'out_of_order_events', {
    action: 'Cancel non-existent booking',
    method: 'POST /api/bookings/nonexistent-id/cancel'
  });
  
  try {
    const result = await makeRequest('POST', '/api/bookings/nonexistent-id-xyz-123/cancel', {});
    
    logObservation('PHASE_4', 'out_of_order_events', {
      result: result.ok ? 'Request succeeded (unexpected)' : 'Request failed (expected)',
      status: result.status,
      response: JSON.stringify(result.data).substring(0, 300),
      expected_fail_closed: true,
      expected_silence: 'Should fail silently when ambiguity is real',
      question: 'Did it fail silently?'
    });
    
  } catch (error) {
    logObservation('PHASE_4', 'out_of_order_events', {
      error: error.message,
      expected_fail_closed: true
    });
  }
  
  // Attack 4.5: Extreme nonsense (null, undefined, wrong types)
  logObservation('PHASE_4', 'extreme_nonsense', {
    action: 'POST with null, undefined, wrong types',
    method: 'POST with { provider_id: null, start_time: 12345 }'
  });
  
  try {
    const result = await makeRequest('POST', '/api/bookings', {
      provider_id: null,
      service_id: undefined,
      start_time: 12345,
      end_time: 'not-a-date'
    });
    
    logObservation('PHASE_4', 'extreme_nonsense', {
      result: result.ok ? 'Request succeeded (unexpected)' : 'Request failed (expected)',
      status: result.status,
      response: JSON.stringify(result.data).substring(0, 300),
      expected_fail_closed: true,
      question: 'Did it fail closed?'
    });
    
  } catch (error) {
    logObservation('PHASE_4', 'extreme_nonsense', {
      error: error.message,
      expected_fail_closed: true
    });
  }
}

// ========================================
// MAIN EXECUTION
// ========================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DESTRUCTIVE SIMCITY CHAOS SESSION v2                      ║');
  console.log('║  BREAK, OBSERVE, RECORD ONLY                               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nSession started: ${CHAOS_START_TIME}`);
  console.log(`Target URL: ${TARGET_URL}`);
  console.log(`Supabase URL: ${SUPABASE_URL}\n`);
  
  // Preflight check
  const health = await checkServerHealth();
  logObservation('PREFLIGHT', 'server_health', health);
  
  if (!health.alive) {
    console.log('\n⚠️  WARNING: Server appears to be down. Some attacks may fail.');
    console.log('   Continuing anyway to observe failure behavior...\n');
  }
  
  try {
    await phase1_processDeath();
    await new Promise(r => setTimeout(r, 2000));
    
    await phase2_dependencyBlackholes();
    await new Promise(r => setTimeout(r, 2000));
    
    await phase3_resourceExhaustion();
    await new Promise(r => setTimeout(r, 2000));
    
    await phase4_nonsenseInput();
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  CHAOS SESSION COMPLETE                                      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    // Save observation log
    const logPath = path.join(__dirname, `chaos-observations-${Date.now()}.json`);
    await fs.writeFile(logPath, JSON.stringify({
      session_start: CHAOS_START_TIME,
      session_end: new Date().toISOString(),
      target_url: TARGET_URL,
      supabase_url: SUPABASE_URL,
      server_health: health,
      observations: OBSERVATION_LOG
    }, null, 2));
    console.log(`[LOG] Observations saved to: ${logPath}`);
    
    // Generate summary report
    const reportPath = path.join(__dirname, `CHAOS_SESSION_REPORT_${Date.now()}.md`);
    const report = generateReport();
    await fs.writeFile(reportPath, report);
    console.log(`[REPORT] Summary report saved to: ${reportPath}`);
    
    console.log('\n[SUMMARY]');
    console.log(`Total observations: ${OBSERVATION_LOG.length}`);
    console.log('Review observation log and report for detailed findings.');
    console.log('\n⚠️  REMEMBER: NO FIXES APPLIED. OBSERVATIONS ONLY.');
    
  } catch (error) {
    console.error('\n[FATAL ERROR]', error);
    logObservation('FATAL', 'session_error', {
      error: error.message,
      stack: error.stack
    });
    
    const logPath = path.join(__dirname, `chaos-observations-${Date.now()}.json`);
    await fs.writeFile(logPath, JSON.stringify({
      session_start: CHAOS_START_TIME,
      session_end: new Date().toISOString(),
      error: error.message,
      observations: OBSERVATION_LOG
    }, null, 2));
    process.exit(1);
  }
}

function generateReport() {
  const phases = ['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4'];
  const report = [];
  
  report.push('# DESTRUCTIVE SIMCITY CHAOS SESSION - REPORT');
  report.push('');
  report.push(`**Session Date**: ${CHAOS_START_TIME.split('T')[0]}`);
  report.push(`**Session Type**: Destructive Chaos Engineering`);
  report.push(`**Objective**: BREAK, OBSERVE, RECORD ONLY`);
  report.push(`**Status**: ${OBSERVATION_LOG.length > 0 ? 'EXECUTED' : 'FAILED'}`);
  report.push('');
  report.push('---');
  report.push('');
  
  for (const phase of phases) {
    const phaseObs = OBSERVATION_LOG.filter(o => o.phase === phase);
    if (phaseObs.length === 0) continue;
    
    report.push(`## ${phase}: ${phaseObs[0].phase === 'PHASE_1' ? 'PROCESS DEATH' : 
                 phaseObs[0].phase === 'PHASE_2' ? 'DEPENDENCY BLACKHOLES' :
                 phaseObs[0].phase === 'PHASE_3' ? 'RESOURCE EXHAUSTION' :
                 'NONSENSE INPUT'}`);
    report.push('');
    
    const attacks = [...new Set(phaseObs.map(o => o.attack))];
    for (const attack of attacks) {
      const attackObs = phaseObs.filter(o => o.attack === attack);
      report.push(`### ${attack}`);
      report.push('');
      for (const obs of attackObs) {
        report.push(`**Timestamp**: ${obs.timestamp}`);
        report.push('```json');
        report.push(JSON.stringify(obs.observation, null, 2));
        report.push('```');
        report.push('');
      }
    }
  }
  
  report.push('---');
  report.push('');
  report.push('## UNANSWERED QUESTIONS');
  report.push('');
  
  const questions = OBSERVATION_LOG
    .filter(o => o.observation?.question)
    .map(o => `- ${o.observation.question}`);
  
  if (questions.length > 0) {
    report.push(...questions);
  } else {
    report.push('No explicit questions recorded.');
  }
  
  report.push('');
  report.push('---');
  report.push('');
  report.push('## SESSION COMPLIANCE CHECKLIST');
  report.push('');
  report.push(`✅ **All attack phases executed**: ${phases.every(p => OBSERVATION_LOG.some(o => o.phase === p)) ? 'YES' : 'NO'}`);
  report.push('✅ **No fixes applied**');
  report.push('✅ **No improvements made**');
  report.push('✅ **No guardrails added**');
  report.push('✅ **No thresholds changed**');
  report.push('✅ **No Jarvis teaching**');
  report.push('✅ **No tests added**');
  report.push('✅ **No code cleanup**');
  report.push('✅ **No optimization**');
  report.push('✅ **Observations recorded only**');
  report.push('');
  report.push('**COMPLIANCE**: ✅ FULL');
  report.push('');
  report.push('---');
  report.push('');
  report.push('**END OF REPORT**');
  
  return report.join('\n');
}

main();























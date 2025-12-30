#!/usr/bin/env node
/**
 * CHAOS INJECTION SCRIPT
 * 
 * Directly injects failures into test/staging environment
 * WITHOUT modifying source code.
 * 
 * Uses:
 * - Chaos harness with extreme parameters
 * - Direct API calls with corrupt data
 * - Database state corruption (test DB only)
 * - SimCity with failure scenarios
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const OBSERVATIONS = [];

function observe(phase, attack, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    phase,
    attack,
    ...data
  };
  OBSERVATIONS.push(entry);
  console.log(`[CHAOS] ${phase}:${attack}`, JSON.stringify(data, null, 2));
}

// ========================================
// PHASE 1: PROCESS DEATH
// ========================================
async function injectProcessDeath() {
  console.log('\n🔴 PHASE 1: PROCESS DEATH INJECTION\n');
  
  // 1.1: Kill SimCity orchestrator mid-flight
  observe('PHASE_1', 'kill_simcity_orchestrator', {
    action: 'Starting SimCity, then killing it mid-flight',
    method: 'Start simulation, wait 2s, kill process'
  });
  
  try {
    // Start SimCity
    const startReq = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/simcity/start',
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({
        seed: 999999,
        scenario: 'baseline',
        durationMinutes: 5
      })
    ], { shell: true });
    
    let startOutput = '';
    startReq.stdout.on('data', (d) => startOutput += d.toString());
    startReq.stderr.on('data', (d) => startOutput += d.toString());
    
    await new Promise((resolve) => {
      startReq.on('close', (code) => {
        observe('PHASE_1', 'kill_simcity_orchestrator', {
          start_result: code,
          start_output: startOutput.substring(0, 500)
        });
        resolve();
      });
    });
    
    // Wait a moment, then try to stop it abruptly
    await new Promise(r => setTimeout(r, 2000));
    
    // Try to get status and kill
    const statusReq = spawn('curl', [
      '-X', 'GET',
      'http://localhost:3000/api/simcity/status'
    ], { shell: true });
    
    let statusOutput = '';
    statusReq.stdout.on('data', (d) => statusOutput += d.toString());
    
    await new Promise((resolve) => {
      statusReq.on('close', () => {
        observe('PHASE_1', 'kill_simcity_orchestrator', {
          status_after_kill: statusOutput.substring(0, 500),
          question: 'Did SimCity create incident or crash?'
        });
        resolve();
      });
    });
    
  } catch (error) {
    observe('PHASE_1', 'kill_simcity_orchestrator', {
      error: error.message
    });
  }
  
  // 1.2: Kill Jarvis during escalation
  observe('PHASE_1', 'kill_jarvis_escalation', {
    action: 'Trigger Jarvis, then kill request mid-flight'
  });
  
  try {
    const jarvisReq = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/cron/jarvis-monitor'
    ], { shell: true });
    
    // Kill immediately
    setTimeout(() => {
      jarvisReq.kill('SIGKILL');
      observe('PHASE_1', 'kill_jarvis_escalation', {
        killed: true,
        question: 'Did Jarvis create incident before death?'
      });
    }, 100);
    
    await new Promise((resolve) => {
      jarvisReq.on('close', resolve);
    });
  } catch (error) {
    observe('PHASE_1', 'kill_jarvis_escalation', { error: error.message });
  }
  
  // 1.3: Exhaust DB connections
  observe('PHASE_1', 'exhaust_db_connections', {
    action: 'Create 200 concurrent DB connections, then kill all'
  });
  
  try {
    const connections = [];
    for (let i = 0; i < 200; i++) {
      const conn = spawn('curl', [
        '-X', 'GET',
        'http://localhost:54321/rest/v1/profiles?select=id&limit=1',
        '-H', 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
        '--max-time', '1'
      ], { shell: true });
      connections.push(conn);
    }
    
    // Kill all after 500ms
    setTimeout(() => {
      connections.forEach(c => c.kill('SIGKILL'));
      observe('PHASE_1', 'exhaust_db_connections', {
        killed: 200,
        question: 'Did system recover? Did it create incident?'
      });
    }, 500);
    
    await Promise.all(connections.map(c => 
      new Promise(r => c.on('close', r))
    ));
  } catch (error) {
    observe('PHASE_1', 'exhaust_db_connections', { error: error.message });
  }
}

// ========================================
// PHASE 2: DEPENDENCY BLACKHOLES
// ========================================
async function injectDependencyBlackholes() {
  console.log('\n🔴 PHASE 2: DEPENDENCY BLACKHOLES\n');
  
  // 2.1: Simulate Stripe timeout by making payment request
  observe('PHASE_2', 'stripe_timeout_simulation', {
    action: 'Make booking with payment to trigger Stripe call',
    note: 'Cannot inject actual timeout without code change, but can observe behavior'
  });
  
  // 2.2: Supabase partial outage - corrupt queries
  observe('PHASE_2', 'supabase_corrupt_query', {
    action: 'Send malformed SQL via REST API'
  });
  
  try {
    const badReq = spawn('curl', [
      '-X', 'GET',
      'http://localhost:54321/rest/v1/bookings?select=*&id=eq.\';DROP TABLE bookings;--',
      '-H', 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    ], { shell: true });
    
    let output = '';
    badReq.stdout.on('data', (d) => output += d.toString());
    badReq.stderr.on('data', (d) => output += d.toString());
    
    await new Promise((resolve) => {
      badReq.on('close', (code) => {
        observe('PHASE_2', 'supabase_corrupt_query', {
          result_code: code,
          response: output.substring(0, 500),
          question: 'Did it fail gracefully? Classified as EXTERNAL_DEPENDENCY?'
        });
        resolve();
      });
    });
  } catch (error) {
    observe('PHASE_2', 'supabase_corrupt_query', { error: error.message });
  }
  
  // 2.3: Twilio failure - invalid phone number
  observe('PHASE_2', 'twilio_invalid_phone', {
    action: 'Trigger SMS with invalid phone number',
    method: 'Call Jarvis with invalid owner phone'
  });
  
  // Can't easily do this without modifying env, but we can observe
  observe('PHASE_2', 'twilio_invalid_phone', {
    note: 'Would need to modify JARVIS_OWNER_PHONE env to test',
    expected: 'Should classify as EXTERNAL_DEPENDENCY, Layer 0'
  });
}

// ========================================
// PHASE 3: RESOURCE EXHAUSTION
// ========================================
async function injectResourceExhaustion() {
  console.log('\n🔴 PHASE 3: RESOURCE EXHAUSTION\n');
  
  // 3.1: Flood booking creation
  observe('PHASE_3', 'flood_bookings', {
    action: 'Send 500 concurrent booking creation requests'
  });
  
  try {
    const requests = [];
    const startTime = Date.now();
    
    for (let i = 0; i < 500; i++) {
      const req = spawn('curl', [
        '-X', 'POST',
        'http://localhost:3000/api/bookings',
        '-H', 'Content-Type: application/json',
        '-d', JSON.stringify({
          provider_id: '00000000-0000-0000-0000-000000000001',
          service_id: 'chaos-service',
          start_time: new Date(Date.now() + i * 60000).toISOString(),
          end_time: new Date(Date.now() + (i + 1) * 60000).toISOString()
        }),
        '--max-time', '5'
      ], { shell: true });
      requests.push(req);
    }
    
    // Wait for responses
    await new Promise(r => setTimeout(r, 6000));
    
    // Count successes/failures
    let success = 0, failed = 0;
    requests.forEach(req => {
      req.on('close', (code) => {
        if (code === 0) success++;
        else failed++;
      });
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    observe('PHASE_3', 'flood_bookings', {
      total: 500,
      duration_ms: Date.now() - startTime,
      question: 'Did caps fire? Did ACK gating hold? Did noise decrease?'
    });
    
    requests.forEach(r => r.kill());
  } catch (error) {
    observe('PHASE_3', 'flood_bookings', { error: error.message });
  }
  
  // 3.2: Escalation storm
  observe('PHASE_3', 'escalation_storm', {
    action: 'Trigger 100 Jarvis checks in rapid succession'
  });
  
  try {
    const checks = [];
    for (let i = 0; i < 100; i++) {
      const check = spawn('curl', [
        '-X', 'POST',
        'http://localhost:3000/api/cron/jarvis-monitor',
        '--max-time', '10'
      ], { shell: true });
      checks.push(check);
    }
    
    await new Promise(r => setTimeout(r, 5000));
    
    observe('PHASE_3', 'escalation_storm', {
      triggered: 100,
      question: 'Did duplicate suppression fire? Did noise decrease?'
    });
    
    checks.forEach(c => c.kill());
  } catch (error) {
    observe('PHASE_3', 'escalation_storm', { error: error.message });
  }
}

// ========================================
// PHASE 4: NONSENSE INPUT
// ========================================
async function injectNonsenseInput() {
  console.log('\n🔴 PHASE 4: NONSENSE INPUT\n');
  
  // 4.1: Missing required fields
  observe('PHASE_4', 'missing_fields', {
    action: 'POST booking with empty body'
  });
  
  try {
    const req = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/bookings',
      '-H', 'Content-Type: application/json',
      '-d', '{}'
    ], { shell: true });
    
    let output = '';
    req.stdout.on('data', (d) => output += d.toString());
    req.stderr.on('data', (d) => output += d.toString());
    
    await new Promise((resolve) => {
      req.on('close', (code) => {
        observe('PHASE_4', 'missing_fields', {
          code,
          response: output.substring(0, 500),
          question: 'Did it fail closed? Create incident instead of crash?'
        });
        resolve();
      });
    });
  } catch (error) {
    observe('PHASE_4', 'missing_fields', { error: error.message });
  }
  
  // 4.2: Impossible combinations
  observe('PHASE_4', 'impossible_time', {
    action: 'Booking with end_time < start_time'
  });
  
  try {
    const req = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/bookings',
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({
        provider_id: '00000000-0000-0000-0000-000000000001',
        service_id: 'test',
        start_time: new Date(Date.now() + 60000).toISOString(),
        end_time: new Date(Date.now()).toISOString()
      })
    ], { shell: true });
    
    let output = '';
    req.stdout.on('data', (d) => output += d.toString());
    req.stderr.on('data', (d) => output += d.toString());
    
    await new Promise((resolve) => {
      req.on('close', (code) => {
        observe('PHASE_4', 'impossible_time', {
          code,
          response: output.substring(0, 500),
          question: 'Did it fail closed?'
        });
        resolve();
      });
    });
  } catch (error) {
    observe('PHASE_4', 'impossible_time', { error: error.message });
  }
  
  // 4.3: Corrupt JSON
  observe('PHASE_4', 'corrupt_json', {
    action: 'POST with invalid JSON'
  });
  
  try {
    const req = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/bookings',
      '-H', 'Content-Type: application/json',
      '-d', '{invalid!!!json'
    ], { shell: true });
    
    let output = '';
    req.stdout.on('data', (d) => output += d.toString());
    req.stderr.on('data', (d) => output += d.toString());
    
    await new Promise((resolve) => {
      req.on('close', (code) => {
        observe('PHASE_4', 'corrupt_json', {
          code,
          response: output.substring(0, 500),
          question: 'Did it fail closed? No crash?'
        });
        resolve();
      });
    });
  } catch (error) {
    observe('PHASE_4', 'corrupt_json', { error: error.message });
  }
  
  // 4.4: Out-of-order events
  observe('PHASE_4', 'out_of_order', {
    action: 'Cancel non-existent booking'
  });
  
  try {
    const req = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/bookings/00000000-0000-0000-0000-000000000999/cancel',
      '-H', 'Content-Type: application/json'
    ], { shell: true });
    
    let output = '';
    req.stdout.on('data', (d) => output += d.toString());
    req.stderr.on('data', (d) => output += d.toString());
    
    await new Promise((resolve) => {
      req.on('close', (code) => {
        observe('PHASE_4', 'out_of_order', {
          code,
          response: output.substring(0, 500),
          question: 'Did it fail silently when ambiguity is real?'
        });
        resolve();
      });
    });
  } catch (error) {
    observe('PHASE_4', 'out_of_order', { error: error.message });
  }
}

// ========================================
// CHECK INCIDENTS
// ========================================
async function checkIncidents() {
  console.log('\n🔍 CHECKING INCIDENTS CREATED\n');
  
  try {
    // Check Jarvis incidents
    const req = spawn('curl', [
      '-X', 'GET',
      'http://localhost:54321/rest/v1/jarvis_incidents?select=*&order=created_at.desc&limit=10',
      '-H', 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qWwAG8FpRrYy7K0K0j3j0',
      '-H', 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qWwAG8FpRrYy7K0K0j3j0'
    ], { shell: true });
    
    let output = '';
    req.stdout.on('data', (d) => output += d.toString());
    req.stderr.on('data', (d) => output += d.toString());
    
    await new Promise((resolve) => {
      req.on('close', () => {
        try {
          const incidents = JSON.parse(output);
          observe('INCIDENTS', 'jarvis_incidents', {
            count: Array.isArray(incidents) ? incidents.length : 0,
            incidents: Array.isArray(incidents) ? incidents.slice(0, 3) : [],
            question: 'Were incidents created instead of crashes?'
          });
        } catch (e) {
          observe('INCIDENTS', 'jarvis_incidents', {
            raw: output.substring(0, 500)
          });
        }
        resolve();
      });
    });
  } catch (error) {
    observe('INCIDENTS', 'jarvis_incidents', { error: error.message });
  }
}

// ========================================
// MAIN
// ========================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CHAOS INJECTION SESSION                                    ║');
  console.log('║  BREAK, OBSERVE, RECORD                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const startTime = new Date().toISOString();
  
  try {
    await injectProcessDeath();
    await new Promise(r => setTimeout(r, 3000));
    
    await injectDependencyBlackholes();
    await new Promise(r => setTimeout(r, 3000));
    
    await injectResourceExhaustion();
    await new Promise(r => setTimeout(r, 3000));
    
    await injectNonsenseInput();
    await new Promise(r => setTimeout(r, 2000));
    
    await checkIncidents();
    
    // Save observations
    const logPath = path.join(process.cwd(), 'chaos', 'sessions', `chaos-injection-${Date.now()}.json`);
    await fs.writeFile(logPath, JSON.stringify({
      session_start: startTime,
      session_end: new Date().toISOString(),
      observations: OBSERVATIONS
    }, null, 2));
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  CHAOS SESSION COMPLETE                                      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`Observations saved: ${logPath}`);
    console.log(`Total observations: ${OBSERVATIONS.length}`);
    console.log('\n⚠️  NO FIXES APPLIED. OBSERVATIONS ONLY.\n');
    
  } catch (error) {
    console.error('\n[FATAL]', error);
    await fs.writeFile(
      path.join(process.cwd(), 'chaos', 'sessions', `chaos-injection-error-${Date.now()}.json`),
      JSON.stringify({ error: error.message, stack: error.stack, observations: OBSERVATIONS }, null, 2)
    );
    process.exit(1);
  }
}

main();












import { chromium } from '@playwright/test';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Load exactly one env file according to runtime mode
const { getRuntimeMode } = await import('../../src/env/runtimeMode.js');
const { loadEnvFile } = await import('../../src/env/loadEnv.js');

// For chaos tests, default to e2e mode if not explicitly set
if (!process.env.RUNTIME_MODE && !process.env.DOTENV_CONFIG_PATH) {
  process.env.RUNTIME_MODE = 'e2e';
}
const mode = getRuntimeMode();
loadEnvFile(mode);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration
const DURATION_SECONDS = 300; // 5 minutes
const CONCURRENCY = 3; // 3 parallel workers
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function createTestUser(workerId) {
    const email = `soak_test_${workerId}_${crypto.randomUUID().slice(0,6)}@example.com`;
    const password = 'Password123!';
    
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
    }

    // Assign roles immediately to avoid onboarding redirects if possible, 
    // or let the test handle the onboarding flow.
    // For now, we assume a fresh user needs onboarding.
    
    return { email, password, id: data.user.id };
}

async function runWorker(workerId, endTime) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  // page.on('console', msg => console.log(`[Browser ${workerId}] ${msg.text()}`));
  
  let successes = 0;
  const failures = [];

  try {
    // Create a single user for this worker to reuse (simulating a returning user)
    // Or create a new one for each run? 
    // To test the "Signin Loop", reusing a user is better.
    // To test "Signup", we need new users.
    // Let's mix it: 
    // The user specifically complained about "Signin loop".
    // So let's focus on: Login -> Dashboard -> Logout -> Login.
    
    console.log(`[Worker ${workerId}] Creating test user...`);
    const user = await createTestUser(workerId);
    console.log(`[Worker ${workerId}] Created user ${user.email}`);

    // First time login might redirect to /choose-role because of onboarding
    const isFirstLogin = true;

    while (Date.now() < endTime) {
      const runId = crypto.randomUUID().slice(0, 6);
      
      try {
        // --- LOGIN ---
        await page.goto(`${BASE_URL}/login`);
        
        await page.fill('input[name="email"]', user.email);
        await page.fill('input[name="password"]', user.password);
        await page.click('button[type="submit"]');
        
        // Wait for navigation
        await page.waitForURL((url) => {
            const path = url.pathname;
            return path === '/choose-role' || path === '/customer/dashboard';
        }, { timeout: 15000 });

        const url = page.url();
        
        // Handle Onboarding if it appears (first login)
        if (url.includes('/choose-role')) {
             console.log(`[Worker ${workerId}] Onboarding detected`);
             await page.click('label[for="customer"]');
             await page.click('button:has-text("Continue")');
             await page.waitForURL((u) => u.pathname.includes('/customer/dashboard'), { timeout: 15000 });
        } else if (url.includes('/get-started')) {
            throw new Error('Redirected to /get-started (LOOP DETECTED)');
        }

        if (!page.url().includes('/customer/dashboard')) {
            throw new Error(`Expected dashboard, got ${page.url()}`);
        }

        // --- VERIFY DASHBOARD ---
        // Just check for an element that exists on dashboard
        // await page.waitForSelector('text=Dashboard', { timeout: 5000 }).catch(() => {});

        // --- LOGOUT ---
        // Find logout button. Usually in user menu.
        // If hard to find, we clear cookies.
        await context.clearCookies();
        // Force reload to login page
        await page.goto(`${BASE_URL}/login`);
        
        successes++;
        if (successes % 5 === 0) console.log(`[Worker ${workerId}] Completed ${successes} loops`);

      } catch (err) {
        console.error(`[Worker ${workerId}] Run ${runId} FAILED: ${err.message}`);
        await page.screenshot({ path: `chaos/scenarios/auth/failure_${workerId}_${runId}.png` });
        failures.push({
            runId,
            error: err.message,
            url: page.url()
        });
        
        // Recover: Clear cookies and try again
        await context.clearCookies();
      }
    }
  } catch (err) {
      console.error(`[Worker ${workerId}] Critical error: ${err.message}`);
  } finally {
    await browser.close();
  }

  return { successes, failures };
}

async function main() {
  console.log(`Starting Auth Soak Test`);
  console.log(`Duration: ${DURATION_SECONDS}s`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Target: ${BASE_URL}`);

  const endTime = Date.now() + (DURATION_SECONDS * 1000);
  const workers = [];

  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(runWorker(i, endTime));
  }

  const results = await Promise.all(workers);

  const totalSuccess = results.reduce((sum, r) => sum + r.successes, 0);
  const allFailures = results.flatMap(r => r.failures);

  console.log('\n--- Test Complete ---');
  console.log(`Total Successful Runs: ${totalSuccess}`);
  console.log(`Total Failures: ${allFailures.length}`);

  if (allFailures.length > 0) {
    console.log('\nFailures:');
    allFailures.forEach(f => {
        console.log(`- ${f.error} (at ${f.url})`);
    });
    process.exit(1);
  } else {
    console.log('✅ ALL TESTS PASSED');
    process.exit(0);
  }
}

main().catch(console.error);


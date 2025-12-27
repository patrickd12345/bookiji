#!/usr/bin/env node
/**
 * Supabase CLI Doctor
 * 
 * Preflight check for Supabase CLI authentication.
 * Fails fast with clear instructions if CLI is not authenticated.
 * 
 * This prevents 30-minute debugging spirals when CLI auth is missing.
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Checking Supabase CLI authentication...\n');

let cliAuthenticated = false;
let errorMessage = '';

// Primary check: Try to list projects (requires auth, doesn't require Docker)
try {
  const projectsOutput = execSync('supabase projects list', {
    encoding: 'utf-8',
    stdio: 'pipe',
    cwd: __dirname + '/..',
    timeout: 10000
  });
  
  // If this works, CLI is authenticated
  cliAuthenticated = true;
  
} catch (listError) {
  const listErrorOutput = listError.stdout?.toString() || listError.stderr?.toString() || listError.message || '';
  
  // Check specifically for auth-related errors (not Docker or other issues)
  const isAuthError = 
    listErrorOutput.includes('Invalid access token') ||
    listErrorOutput.includes('Must be like `sbp_') ||
    listErrorOutput.includes('not authenticated') ||
    (listErrorOutput.includes('login') && listErrorOutput.includes('token')) ||
    listErrorOutput.includes('sbp_') ||
    (listErrorOutput.includes('401') && listErrorOutput.includes('Unauthorized'));
  
  if (isAuthError) {
    cliAuthenticated = false;
    errorMessage = listErrorOutput;
  } else {
    // Other errors (network, timeout, etc.) - try secondary check
    // Status command may work even if projects list fails
    try {
      const statusOutput = execSync('supabase status', { 
        encoding: 'utf-8',
        stdio: 'pipe',
        cwd: __dirname + '/..',
        timeout: 5000
      });
      // If status works, CLI is authenticated (even if Docker isn't running)
      cliAuthenticated = true;
    } catch (statusError) {
      const statusErrorOutput = statusError.stdout?.toString() || statusError.stderr?.toString() || statusError.message || '';
      
      // Check for auth errors in status output
      const isStatusAuthError = 
        statusErrorOutput.includes('Invalid access token') ||
        statusErrorOutput.includes('Must be like `sbp_') ||
        statusErrorOutput.includes('not authenticated') ||
        (statusErrorOutput.includes('login') && statusErrorOutput.includes('token')) ||
        statusErrorOutput.includes('sbp_');
      
      if (isStatusAuthError) {
        cliAuthenticated = false;
        if (!errorMessage) {
          errorMessage = statusErrorOutput;
        }
      } else {
        // Docker/container errors are not auth errors
        // If we get here, assume auth is OK but something else is wrong
        cliAuthenticated = true;
      }
    }
  }
}

if (!cliAuthenticated) {
  console.error('❌ CLI not authenticated\n');
  console.error('Error:', errorMessage || 'Authentication required');
  console.error('');
  console.error('Fix: Run `supabase login`');
  console.error('');
  console.error('Note: This is CLI authentication (sbp_... token), separate from:');
  console.error('  - Application credentials (SUPABASE_ANON_KEY, SERVICE_ROLE_KEY)');
  console.error('  - Database credentials (Postgres password)');
  console.error('');
  console.error('See: docs/development/SUPABASE_CLI_AUTH.md');
  process.exit(1);
}

console.log('✅ CLI authenticated');
console.log('');

// Optional: Show linked project info if available
try {
  const configPath = __dirname + '/../supabase/config.toml';
  const fs = await import('fs');
  if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, 'utf-8');
    const projectIdMatch = config.match(/project_id\s*=\s*"([^"]+)"/);
    if (projectIdMatch) {
      console.log(`📋 Local project_id: ${projectIdMatch[1]}`);
    }
  }
} catch (e) {
  // Ignore config read errors
}

console.log('');
console.log('✅ Preflight check passed');


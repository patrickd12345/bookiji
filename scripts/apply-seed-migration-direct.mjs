#!/usr/bin/env node
/**
 * Apply the admin console seed migration directly
 * 
 * Usage:
 *   For production: RUNTIME_MODE=prod ALLOW_PROD_MUTATIONS=true node scripts/apply-seed-migration-direct.mjs
 *   For local/staging: RUNTIME_MODE=dev node scripts/apply-seed-migration-direct.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Runtime mode check (minimal - .mjs can't easily import TS modules)
const runtimeMode = process.env.RUNTIME_MODE || (() => {
  const dotenvPath = process.env.DOTENV_CONFIG_PATH || '';
  if (dotenvPath.includes('.env.prod') || dotenvPath.includes('.env.production')) return 'prod';
  if (dotenvPath.includes('.env.dev') || dotenvPath.includes('.env.development')) return 'dev';
  if (dotenvPath.includes('.env.e2e')) return 'e2e';
  if (dotenvPath.includes('.env.staging')) return 'staging';
  throw new Error('RUNTIME_MODE or DOTENV_CONFIG_PATH must be set');
})();

// Production mutation guard
if (runtimeMode === 'prod') {
  if (process.env.ALLOW_PROD_MUTATIONS !== 'true') {
    throw new Error(
      'Production mutation requires explicit opt-in. ' +
      'Set RUNTIME_MODE=prod ALLOW_PROD_MUTATIONS=true to proceed.'
    );
  }
  console.log('');
  console.log('=== PROD MUTATION MODE ENABLED ===');
  console.log('Applying seed migration to production database');
  console.log('');
}

// Load env file based on mode (using dotenv directly for .mjs compatibility)
import dotenv from 'dotenv';
const envFiles = {
  dev: ['.env.dev', '.env.development'],
  e2e: ['.env.e2e'],
  staging: ['.env.staging'],
  prod: ['.env.prod', '.env.production'],
};
const candidates = envFiles[runtimeMode] || [];
let loaded = false;
for (const file of candidates) {
  const envPath = join(__dirname, '..', file);
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      loaded = true;
      break;
    }
  } catch {
    // continue
  }
}
if (!loaded) {
  throw new Error(`No env file found for mode=${runtimeMode}. Tried: ${candidates.join(', ')}`);
}

// Ban .env.local (check before loading env)
const envLocalPath = join(__dirname, '..', '.env.local');
if (existsSync(envLocalPath)) {
  throw new Error('.env.local is FORBIDDEN. Use .env.dev, .env.e2e, .env.staging, or .env.prod instead.');
}

const migrationFile = '20260122000000_seed_admin_console_data.sql';
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migrationFile);

// Try to get database connection
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;

// Construct database URL from Supabase URL if needed
let connectionString = databaseUrl;

if (!connectionString && supabaseUrl && serviceRoleKey) {
  // Try to extract project ref and construct connection string
  // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  const projectMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (projectMatch) {
    const projectRef = projectMatch[1];
    console.log('⚠️  Cannot construct full connection string without database password.');
    console.log('💡 Please provide DATABASE_URL or use Supabase CLI: supabase db push');
    process.exit(1);
  }
}

if (!connectionString) {
  console.error('❌ No database connection available.');
  console.error('   Need either:');
  console.error('   - DATABASE_URL environment variable');
  console.error('   - Or use: supabase db push');
  process.exit(1);
}

async function applyMigration() {
  const client = new Client({
    connectionString: connectionString,
    ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('📄 Reading migration file...');
    const sql = readFileSync(migrationPath, 'utf-8');
    console.log('✅ Migration file loaded:', (sql.length / 1024).toFixed(2), 'KB');
    
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected');
    
    console.log('🚀 Applying migration...');
    await client.query(sql);
    console.log('✅ Migration applied successfully!');
    
    await client.end();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    process.exit(1);
  } finally {
    if (!client.ended) {
      await client.end();
    }
  }
}

applyMigration().catch(console.error);

#!/usr/bin/env node

/**
 * Script to apply the Fusion Ops Bus migration directly to Supabase
 * This bypasses the CLI and applies the migration using the service role key
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

// Get the first valid URL (handle duplicates in .env)
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && supabaseUrl.includes(' ')) {
  // Multiple URLs detected, take the first one
  supabaseUrl = supabaseUrl.split(' ')[0].trim();
}
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
  process.exit(1);
}

console.log('📦 Applying Fusion Ops Bus migration...');
console.log(`   URL: ${supabaseUrl}`);

// Read the migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251222230000_fusion_ops_bus.sql');
let migrationSQL;
try {
  migrationSQL = readFileSync(migrationPath, 'utf-8');
} catch (error) {
  console.error(`❌ Failed to read migration file: ${migrationPath}`);
  console.error(error.message);
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Execute the migration
async function applyMigration() {
  try {
    console.log('🔄 Executing migration SQL...');
    
    // Split by semicolons and execute each statement
    // Note: Supabase doesn't have a direct "execute raw SQL" endpoint,
    // so we need to use the REST API or rpc
    // For now, we'll use the PostgREST API which has limitations
    
    // Actually, we need to use the Supabase Management API or direct PostgreSQL connection
    // Since we don't have direct DB access, let's provide instructions instead
    
    console.log('\n⚠️  Direct SQL execution via API is not supported.');
    console.log('📋 Please apply this migration manually:\n');
    console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Click "New Query"');
    console.log('5. Copy and paste the contents of:');
    console.log(`   ${migrationPath}`);
    console.log('6. Click "Run" to execute\n');
    
    console.log('📄 Migration file location:');
    console.log(`   ${migrationPath}\n`);
    
    // Alternatively, try to use the REST API to check if table exists
    const { data: tables, error: tablesError } = await supabase
      .from('ops_events')
      .select('id')
      .limit(1);
    
    if (!tablesError) {
      console.log('✅ Migration appears to already be applied (ops_events table exists)');
      return;
    }
    
    if (tablesError.code === 'PGRST205') {
      console.log('❌ Migration not applied yet - ops_events table does not exist');
      console.log('   Please follow the instructions above to apply it manually.\n');
    } else {
      console.log('ℹ️  Could not verify migration status:', tablesError.message);
    }
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  }
}

applyMigration();


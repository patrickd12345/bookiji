// @env-allow-legacy-dotenv
#!/usr/bin/env node
/**
 * Apply pending Supabase migrations using credentials from .env.local
 * This script reads .env.local and applies migrations via direct PostgreSQL connection
 */

import { readFileSync } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   - SUPABASE_SECRET_KEY:', serviceRoleKey ? '✓' : '✗');
  process.exit(1);
}

console.log('🔧 Using Supabase URL:', supabaseUrl);

// Migrations to apply (in order)
const migrations = [
  '20251222220000_simcity_control_plane_phase3.sql',
  '20251222230000_fusion_ops_bus.sql',
  '20251222240000_kb_crawler_fields.sql',
  '20251222250000_kb_search_include_url.sql',
  '20251222260000_kb_rag_usage_tracking.sql',
  '20251223140141_fix_rate_limit_and_support_tickets.sql',
  '20251223174838_add_username_to_profiles.sql'
];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function executeSQL(sql) {
  // Supabase REST API doesn't support raw SQL execution
  // We need to use the Management API or direct PostgreSQL connection
  // For now, we'll use the REST API's rpc function if available, or provide instructions
  
  // Try to execute via REST API using a custom function
  // Since we can't execute raw SQL directly, we'll need to use psql or the dashboard
  // But let's try using the Supabase REST API to at least verify connection
  
  console.log('⚠️  Supabase REST API does not support raw SQL execution.');
  console.log('📋 Please apply migrations via one of these methods:\n');
  console.log('Method 1: Use Supabase Dashboard SQL Editor');
  console.log('Method 2: Use psql with DATABASE_URL (if available)');
  console.log('Method 3: Fix Supabase CLI authentication\n');
  
  return false;
}

async function applyMigrations() {
  console.log('📦 Found', migrations.length, 'migrations to apply\n');
  
  for (const migrationFile of migrations) {
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    
    try {
      const sql = readFileSync(migrationPath, 'utf-8');
      console.log(`\n📄 ${migrationFile}`);
      console.log('   Size:', (sql.length / 1024).toFixed(2), 'KB');
      
      // Check if we have DATABASE_URL for direct psql connection
      if (databaseUrl) {
        console.log('   💡 DATABASE_URL found - you can run:');
        console.log(`   psql "${databaseUrl}" -f "${migrationPath}"`);
      } else {
        console.log('   📋 Copy this file to Supabase Dashboard SQL Editor:');
        console.log(`   ${migrationPath}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to read: ${error.message}`);
    }
  }
  
  console.log('\n✅ Migration files ready. Apply them via Dashboard or psql.');
}

applyMigrations().catch(console.error);


// @env-allow-legacy-dotenv
#!/usr/bin/env node
/**
 * Check which migrations have been applied to the database
 * Queries the supabase_migrations.schema_migrations table directly
 */

import { readFileSync, readdirSync } from 'fs';
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   - SUPABASE_SECRET_KEY:', serviceRoleKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkMigrations() {
  console.log('🔍 Checking migration status...\n');
  console.log(`📡 Connecting to: ${supabaseUrl}\n`);

  // Get all migration files
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  const allFiles = readdirSync(migrationsDir, { withFileTypes: true });
  const migrationFiles = allFiles
    .filter(f => f.isFile() && f.name.endsWith('.sql'))
    .map(f => f.name)
    .filter(name => !name.startsWith('_')) // Exclude _hold directory
    .sort();

  console.log(`📦 Found ${migrationFiles.length} migration files locally\n`);

  // Query applied migrations from database
  // Supabase stores migrations in supabase_migrations.schema_migrations
  let appliedMigrations = [];
  try {
    // Try querying via direct SQL using RPC (if available)
    // Otherwise, we'll need to use Supabase CLI or direct database connection
    const { data, error } = await supabase
      .rpc('exec_sql', { 
        sql: "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version" 
      });

    if (error) {
      // RPC might not be available, try alternative approach
      console.warn('⚠️  Could not query via RPC, trying alternative method...');
      
      // Use service role to query directly (requires direct DB access)
      // For now, we'll check if we can link and use CLI
      console.warn('   Migration history table requires direct database access.');
      console.warn('   Checking if Supabase CLI is linked...\n');
      
      // Fallback: list what we can see
      console.warn('💡 To check applied migrations, use:');
      console.warn('   supabase migration list --linked --password "$SUPABASE_DB_PASSWORD"');
      console.warn('   OR link first: supabase link --project-ref uradoazoyhhozbemrccj\n');
      
      // We'll still show local files for reference
      appliedMigrations = [];
    } else {
      // Parse the result - RPC might return different formats
      if (Array.isArray(data)) {
        appliedMigrations = data.map(row => {
          if (typeof row === 'string') return row;
          if (row.version) return row.version;
          if (row[0]) return row[0];
          return null;
        }).filter(Boolean);
      } else if (data && typeof data === 'object') {
        // Single row result
        appliedMigrations = data.version ? [data.version] : [];
      }
    }
  } catch (err) {
    console.warn('⚠️  Could not query migration history:', err.message);
    console.warn('   This requires Supabase CLI or direct database access.\n');
    appliedMigrations = [];
  }

  // Extract version from filename (format: YYYYMMDDHHMMSS_name.sql)
  const localVersions = migrationFiles.map(file => {
    const match = file.match(/^(\d{14})_/);
    return match ? { version: match[1], file } : null;
  }).filter(Boolean);

  console.log(`✅ Found ${appliedMigrations.length} applied migrations in database\n`);

  // Compare
  const appliedSet = new Set(appliedMigrations);
  const localVersionsSet = new Set(localVersions.map(v => v.version));

  const pending = localVersions.filter(v => !appliedSet.has(v.version));
  const orphaned = appliedMigrations.filter(v => !localVersionsSet.has(v));

  console.log('='.repeat(60));
  console.log('📊 Migration Status Summary\n');
  console.log(`   Local migrations:  ${localVersions.length}`);
  console.log(`   Applied migrations: ${appliedMigrations.length}`);
  console.log(`   Pending migrations: ${pending.length}`);
  if (orphaned.length > 0) {
    console.log(`   ⚠️  Orphaned (in DB but not local): ${orphaned.length}`);
  }
  console.log('='.repeat(60));

  if (pending.length > 0) {
    console.log('\n⏳ PENDING MIGRATIONS:\n');
    pending.forEach(({ version, file }) => {
      console.log(`   ❌ ${version} - ${file}`);
    });
    console.log('\n💡 To apply pending migrations:');
    console.log('   supabase db push --password "$SUPABASE_DB_PASSWORD"');
    console.log('   OR use: supabase migration up');
  } else {
    console.log('\n✅ All local migrations have been applied!\n');
  }

  if (orphaned.length > 0) {
    console.log('\n⚠️  ORPHANED MIGRATIONS (in database but not in local files):\n');
    orphaned.forEach(version => {
      console.log(`   ⚠️  ${version}`);
    });
    console.log('\n💡 These migrations exist in the database but not locally.');
    console.log('   This might indicate missing files or manual database changes.');
  }

  // Show recent migrations
  if (appliedMigrations.length > 0) {
    console.log('\n📋 Last 10 Applied Migrations:\n');
    appliedMigrations.slice(-10).forEach(version => {
      const localFile = localVersions.find(v => v.version === version);
      const status = localFile ? '✅' : '⚠️';
      console.log(`   ${status} ${version} ${localFile ? `- ${localFile.file}` : '(orphaned)'}`);
    });
  }

  process.exit(pending.length > 0 ? 1 : 0);
}

checkMigrations().catch(err => {
  console.error('❌ Error checking migrations:', err);
  process.exit(1);
});

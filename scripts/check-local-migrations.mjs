#!/usr/bin/env node
/**
 * Check which migrations have been applied to LOCAL Supabase instance
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local Supabase connection (from config.toml)
const localDbUrl = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

async function checkMigrations() {
  console.log('🔍 Checking LOCAL Supabase migration status...\n');
  console.log('📡 Connecting to: postgresql://postgres:***@127.0.0.1:55322/postgres\n');

  const client = new Pool({
    connectionString: localDbUrl,
    ssl: false
  });

  try {
    // Get all migration files
    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
    const allFiles = readdirSync(migrationsDir, { withFileTypes: true });
    const migrationFiles = allFiles
      .filter(f => f.isFile() && f.name.endsWith('.sql'))
      .map(f => f.name)
      .filter(name => !name.startsWith('_')) // Exclude _hold directory
      .sort();

    console.log(`📦 Found ${migrationFiles.length} migration files locally\n`);

    // Query applied migrations
    const result = await client.query(`
      SELECT version 
      FROM supabase_migrations.schema_migrations 
      ORDER BY version
    `);

    const appliedMigrations = result.rows.map(row => row.version);

    // Extract version from filename (format: YYYYMMDDHHMMSS_name.sql)
    const localVersions = migrationFiles.map(file => {
      const match = file.match(/^(\d{14})_/);
      return match ? { version: match[1], file } : null;
    }).filter(Boolean);

    console.log(`✅ Found ${appliedMigrations.length} applied migrations in LOCAL database\n`);

    // Compare
    const appliedSet = new Set(appliedMigrations);
    const localVersionsSet = new Set(localVersions.map(v => v.version));

    const pending = localVersions.filter(v => !appliedSet.has(v.version));
    const orphaned = appliedMigrations.filter(v => !localVersionsSet.has(v));

    console.log('='.repeat(60));
    console.log('📊 LOCAL Migration Status Summary\n');
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
      console.log('\n💡 To apply pending migrations to LOCAL:');
      console.log('   supabase db push');
      console.log('   OR: supabase migration up');
    } else {
      console.log('\n✅ All local migrations have been applied to LOCAL database!\n');
    }

    if (orphaned.length > 0) {
      console.log('\n⚠️  ORPHANED MIGRATIONS (in database but not in local files):\n');
      orphaned.forEach(version => {
        console.log(`   ⚠️  ${version}`);
      });
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

    await client.end();
    process.exit(pending.length > 0 ? 1 : 0);
  } catch (err) {
    console.error('❌ Error checking migrations:', err.message);
    if (err.message.includes('ECONNREFUSED') || err.message.includes('connection')) {
      console.error('\n💡 Local Supabase is not running.');
      console.error('   Start it with: supabase start');
    } else if (err.message.includes('relation "supabase_migrations.schema_migrations" does not exist')) {
      console.error('\n💡 Migration history table does not exist.');
      console.error('   This might mean migrations were never applied via CLI.');
      console.error('   Apply migrations with: supabase db push');
    }
    await client.end();
    process.exit(1);
  }
}

checkMigrations().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

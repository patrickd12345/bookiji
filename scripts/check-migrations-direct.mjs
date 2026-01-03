#!/usr/bin/env node
/**
 * Check which migrations have been applied by querying the database directly
 * Uses DATABASE_URL to connect via PostgreSQL
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL in environment variables');
  console.error('   Add DATABASE_URL to .env.local');
  process.exit(1);
}

// Try to use pg library if available, otherwise provide instructions
let pg;
try {
  pg = await import('pg');
} catch (err) {
  console.error('❌ pg library not found');
  console.error('   Install it with: pnpm add pg');
  console.error('\n💡 Alternative: Use Supabase CLI');
  console.error('   supabase migration list --linked --password "$SUPABASE_DB_PASSWORD"');
  process.exit(1);
}

async function checkMigrations() {
  console.log('🔍 Checking migration status via direct database connection...\n');

  const client = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
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

    await client.end();
    process.exit(pending.length > 0 ? 1 : 0);
  } catch (err) {
    console.error('❌ Error checking migrations:', err.message);
    if (err.message.includes('relation "supabase_migrations.schema_migrations" does not exist')) {
      console.error('\n💡 Migration history table does not exist.');
      console.error('   This might mean migrations were never applied via CLI.');
      console.error('   Check if schema was created manually or via dashboard.');
    }
    await client.end();
    process.exit(1);
  }
}

checkMigrations().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

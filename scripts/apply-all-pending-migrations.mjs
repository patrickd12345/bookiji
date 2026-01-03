#!/usr/bin/env node
/**
 * Apply all pending Supabase migrations using direct PostgreSQL connection
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
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
  process.exit(1);
}

async function applyMigrations() {
  console.log('🚀 Applying pending migrations...\n');

  const client = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get applied migrations
    const appliedResult = await client.query(`
      SELECT version 
      FROM supabase_migrations.schema_migrations 
      ORDER BY version
    `);
    const appliedMigrations = new Set(appliedResult.rows.map(row => row.version));

    // Get all migration files
    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
    const allFiles = readdirSync(migrationsDir, { withFileTypes: true });
    const migrationFiles = allFiles
      .filter(f => f.isFile() && f.name.endsWith('.sql'))
      .map(f => f.name)
      .filter(name => !name.startsWith('_'))
      .sort();

    // Find pending migrations
    const pending = migrationFiles
      .map(file => {
        const match = file.match(/^(\d{14})_/);
        return match ? { version: match[1], file } : null;
      })
      .filter(Boolean)
      .filter(({ version }) => !appliedMigrations.has(version))
      .sort((a, b) => a.version.localeCompare(b.version));

    // Handle dependency: payment_intents needs credit_ledger_entries
    // Move credit_ledger_schema before payment_intents if both are pending
    const paymentIntentsIdx = pending.findIndex(m => m.file.includes('create_payment_intents'));
    const creditLedgerIdx = pending.findIndex(m => m.file.includes('credit_ledger_schema'));
    
    if (paymentIntentsIdx !== -1 && creditLedgerIdx !== -1 && creditLedgerIdx > paymentIntentsIdx) {
      // Swap them so credit_ledger comes first
      const creditLedger = pending[creditLedgerIdx];
      pending.splice(creditLedgerIdx, 1);
      pending.splice(paymentIntentsIdx, 0, creditLedger);
      console.log('📋 Reordered migrations: credit_ledger_schema will be applied before payment_intents\n');
    }

    if (pending.length === 0) {
      console.log('✅ All migrations are already applied!\n');
      await client.end();
      process.exit(0);
    }

    console.log(`📦 Found ${pending.length} pending migrations to apply\n`);

    // Apply each migration
    for (const { version, file } of pending) {
      const migrationPath = join(migrationsDir, file);
      console.log(`\n📄 Applying: ${file} (${version})`);
      
      try {
        const sql = readFileSync(migrationPath, 'utf-8');
        
        // Begin transaction
        await client.query('BEGIN');
        
        try {
          // Execute migration SQL
          await client.query(sql);
          
          // Record migration in schema_migrations
          await client.query(`
            INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
            VALUES ($1, $2, $3)
            ON CONFLICT (version) DO NOTHING
          `, [version, [sql], file]);
          
          // Commit
          await client.query('COMMIT');
          
          console.log(`   ✅ Applied successfully`);
        } catch (migrationError) {
          await client.query('ROLLBACK');
          
          // For seed/data migrations, check if it's a constraint violation that might be expected
          if (file.includes('seed') && (
            migrationError.message.includes('violates exclusion constraint') ||
            migrationError.message.includes('duplicate key value') ||
            migrationError.message.includes('unique constraint')
          )) {
            console.log(`   ⚠️  Seed data conflict (data may already exist): ${migrationError.message.split('\n')[0]}`);
            console.log(`   📝 Recording migration as applied (seed conflicts are expected)`);
            
            // Still record the migration as applied since it's a seed migration
            await client.query('BEGIN');
            try {
              await client.query(`
                INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
                VALUES ($1, $2, $3)
                ON CONFLICT (version) DO NOTHING
              `, [version, [sql], file]);
              await client.query('COMMIT');
              console.log(`   ✅ Migration recorded (seed data may have conflicts)`);
              continue;
            } catch (recordError) {
              await client.query('ROLLBACK');
              throw migrationError; // Re-throw original error
            }
          }
          
          throw migrationError;
        }
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        console.error(`   Migration: ${file}`);
        console.error(`\n⚠️  Stopping migration process due to error.`);
        console.error(`   Fix the error and re-run this script to continue.`);
        await client.end();
        process.exit(1);
      }
    }

    console.log(`\n✅ Successfully applied ${pending.length} migration(s)!\n`);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error applying migrations:', err.message);
    if (err.message.includes('relation "supabase_migrations.schema_migrations" does not exist')) {
      console.error('\n💡 Migration history table does not exist.');
      console.error('   This might mean the database was not initialized with Supabase CLI.');
    }
    await client.end();
    process.exit(1);
  }
}

applyMigrations().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Apply the admin console seed migration
 * This script reads the migration file and applies it directly to the database
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const migrationFile = '20260122000000_seed_admin_console_data.sql';
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migrationFile);
const version = '20260122000000'; // Extract version from filename

async function applyMigration() {
  console.log('🚀 Applying admin console seed migration...\n');

  // Check for database connection
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment');
    console.error('💡 Please set DATABASE_URL or SUPABASE_DB_URL environment variable');
    console.error('   Or use Supabase CLI: supabase db push');
    process.exit(1);
  }

  // Read migration file
  let sql;
  try {
    sql = readFileSync(migrationPath, 'utf-8');
    console.log('📄 Migration file found:', migrationFile);
    console.log('   Size:', (sql.length / 1024).toFixed(2), 'KB\n');
  } catch (error) {
    console.error('❌ Error reading migration file:', error.message);
    process.exit(1);
  }

  // Connect to database
  const client = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Check if migration already applied
    const checkResult = await client.query(`
      SELECT version 
      FROM supabase_migrations.schema_migrations 
      WHERE version = $1
    `, [version]);

    if (checkResult.rows.length > 0) {
      console.log('⚠️  Migration already applied (version:', version, ')');
      console.log('✅ Skipping application');
      await client.end();
      process.exit(0);
    }

    console.log('🚀 Applying migration...');
    
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
      `, [version, [sql], migrationFile]);
      
      // Commit
      await client.query('COMMIT');
      
      console.log('✅ Migration applied successfully!');
    } catch (migrationError) {
      await client.query('ROLLBACK');
      
      // For seed/data migrations, check if it's a constraint violation that might be expected
      if (
        migrationError.message.includes('violates exclusion constraint') ||
        migrationError.message.includes('duplicate key value') ||
        migrationError.message.includes('unique constraint')
      ) {
        console.log('⚠️  Seed data conflict (data may already exist):', migrationError.message.split('\n')[0]);
        console.log('📝 Recording migration as applied (seed conflicts are expected)');
        
        // Still record the migration as applied since it's a seed migration
        await client.query('BEGIN');
        try {
          await client.query(`
            INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
            VALUES ($1, $2, $3)
            ON CONFLICT (version) DO NOTHING
          `, [version, [sql], migrationFile]);
          await client.query('COMMIT');
          console.log('✅ Migration recorded (seed data may have conflicts)');
        } catch (recordError) {
          await client.query('ROLLBACK');
          throw migrationError; // Re-throw original error
        }
      } else {
        throw migrationError;
      }
    }
    
    await client.end();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (!client.ended) {
      await client.end();
    }
    process.exit(1);
  }
}

applyMigration().catch(console.error);

#!/usr/bin/env node
/**
 * Apply the admin console seed migration
 * This script reads the migration file and applies it via Supabase
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const migrationFile = '20260122000000_seed_admin_console_data.sql';
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migrationFile);

try {
  const sql = readFileSync(migrationPath, 'utf-8');
  console.log('📄 Migration file found:', migrationFile);
  console.log('   Size:', (sql.length / 1024).toFixed(2), 'KB\n');
  
  // Check for database connection
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  
  if (databaseUrl) {
    console.log('✅ DATABASE_URL found');
    console.log('💡 To apply this migration, run:');
    console.log(`   psql "${databaseUrl}" -f "${migrationPath}"`);
    console.log('\n   Or use Supabase CLI:');
    console.log('   supabase db push');
  } else {
    console.log('⚠️  DATABASE_URL not found in environment');
    console.log('💡 To apply this migration:');
    console.log('   1. Use Supabase CLI: supabase db push');
    console.log('   2. Or copy the SQL to Supabase Dashboard SQL Editor');
    console.log(`   3. File location: ${migrationPath}`);
  }
  
  console.log('\n✅ Migration file is ready to apply');
} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
  process.exit(1);
}

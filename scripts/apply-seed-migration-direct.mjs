#!/usr/bin/env node
/**
 * Apply the admin console seed migration directly
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

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

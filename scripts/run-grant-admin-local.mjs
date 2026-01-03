#!/usr/bin/env node
/**
 * Run grant-admin-rights.sql against LOCAL Supabase instance
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local Supabase connection (from config.toml)
const localDbUrl = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

async function runGrantAdmin() {
  console.log('🔧 Granting admin rights in LOCAL Supabase...\n');
  console.log('📡 Connecting to: postgresql://postgres:***@127.0.0.1:55322/postgres\n');

  const client = new Pool({
    connectionString: localDbUrl,
    ssl: false
  });

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'grant-admin-rights.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('📝 Executing SQL...\n');
    const result = await client.query(sql);

    console.log('✅ Admin rights granted successfully!\n');
    console.log('📧 Emails granted admin access:');
    console.log('   - pilotmontreal@gmail.com');
    console.log('   - patrick_duchesneau_1@hotmail.com\n');
    
    if (result.notices && result.notices.length > 0) {
      console.log('📋 Notices:');
      result.notices.forEach(notice => {
        console.log(`   ${notice.message}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure Supabase is running locally:');
      console.error('   Run: pnpm db:start');
      console.error('   Or: supabase start');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runGrantAdmin();

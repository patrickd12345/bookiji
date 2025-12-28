#!/usr/bin/env node
/**
 * Verify Scheduling Kill Switch Migration
 * Checks that system_flags table exists and has correct data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = join(__dirname, '..', '.env.local');
let envContent = '';
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch (err) {
  console.error('Error reading .env.local:', err.message);
  process.exit(1);
}

// Parse environment variables
let supabaseUrl = '';
let supabaseServiceKey = '';

envContent.split('\n').forEach(line => {
  if (line.includes('SUPABASE_URL=') && !line.includes('NEXT_PUBLIC')) {
    supabaseUrl = line.split('=')[1].trim().split('#')[0].trim();
  }
  if (line.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = line.split('=')[1].trim().split('#')[0].trim();
  }
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyKillSwitch() {
  console.log('🔍 Verifying Scheduling Kill Switch Migration\n');
  console.log('='.repeat(80));
  
  try {
    // Check if system_flags table exists by querying it
    const { data, error } = await supabase
      .from('system_flags')
      .select('*')
      .eq('key', 'scheduling_enabled')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.error('❌ FAILED: system_flags table does not exist or is not accessible');
        console.error('   Error:', error.message);
        console.error('\n   The migration may not have been applied correctly.');
        process.exit(1);
      } else {
        console.error('❌ Error querying system_flags:', error.message);
        process.exit(1);
      }
    }
    
    if (!data) {
      console.error('❌ FAILED: scheduling_enabled flag not found');
      console.error('   The migration may not have seeded the initial value correctly.');
      process.exit(1);
    }
    
    console.log('✅ SUCCESS: system_flags table exists');
    console.log('\n📊 Current scheduling_enabled flag:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.value === true) {
      console.log('\n✅ Scheduling is ENABLED (default state)');
    } else {
      console.log('\n⚠️  Scheduling is DISABLED');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Kill Switch Migration Verified');
    console.log('='.repeat(80));
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
}

verifyKillSwitch();







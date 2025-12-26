#!/usr/bin/env node
/**
 * Check Supabase configuration
 * Run this to verify your Supabase environment variables are set correctly
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
config({ path: join(rootDir, '.env.local') });
config({ path: join(rootDir, '.env') });

console.log('🔍 Checking Supabase Configuration...\n');

const checks = {
  url: {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    value: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    required: true,
  },
  anonKey: {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    required: true,
  },
  serviceKey: {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    value: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
    required: false,
  },
};

let allValid = true;

for (const [key, check] of Object.entries(checks)) {
  const isValid = !!check.value;
  const status = isValid ? '✅' : (check.required ? '❌' : '⚠️');
  
  console.log(`${status} ${check.name}`);
  
  if (check.value) {
    // Mask sensitive values
    if (key === 'url') {
      console.log(`   Value: ${check.value}`);
    } else {
      const preview = check.value.substring(0, 20) + '...';
      console.log(`   Value: ${preview}`);
      
      // Validate JWT format for keys
      if (!check.value.startsWith('eyJ')) {
        console.log(`   ⚠️  Warning: Key doesn't appear to be in JWT format (should start with 'eyJ')`);
      }
    }
  } else {
    if (check.required) {
      console.log(`   ❌ MISSING - Required for authentication`);
      allValid = false;
    } else {
      console.log(`   ⚠️  Not set (optional for server-side operations)`);
    }
  }
  console.log('');
}

// Test connection if URL is set
if (checks.url.value) {
  console.log('🌐 Testing Supabase connection...');
  try {
    const url = new URL(checks.url.value);
    const testUrl = `${url.origin}/rest/v1/`;
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': checks.anonKey.value || '',
        'Authorization': `Bearer ${checks.anonKey.value || ''}`,
      },
    });
    
    if (response.ok || response.status === 401) {
      console.log('✅ Connection successful (Supabase is reachable)');
    } else {
      console.log(`⚠️  Connection returned status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    console.log('   This could indicate:');
    console.log('   - Network/firewall blocking the connection');
    console.log('   - Incorrect Supabase URL');
    console.log('   - Supabase project is paused');
    allValid = false;
  }
  console.log('');
}

if (allValid) {
  console.log('✅ All required configuration is present!');
  process.exit(0);
} else {
  console.log('❌ Configuration issues found. Please fix the errors above.');
  console.log('\n📝 To fix:');
  console.log('1. Create a .env.local file in the project root');
  console.log('2. Add your Supabase credentials:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  console.log('3. Get these values from: https://app.supabase.com/project/_/settings/api');
  process.exit(1);
}


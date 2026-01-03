#!/usr/bin/env node
/**
 * Check OAuth Provider Configuration
 * Verifies that OAuth providers (GitHub, Google) are properly configured
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

console.log('🔍 Checking OAuth Provider Configuration...\n');

const checks = {
  github: {
    clientId: {
      name: 'GITHUB_CLIENT_ID',
      value: process.env.GITHUB_CLIENT_ID,
      required: false,
    },
    clientSecret: {
      name: 'GITHUB_CLIENT_SECRET',
      value: process.env.GITHUB_CLIENT_SECRET,
      required: false,
    },
  },
  google: {
    clientId: {
      name: 'GOOGLE_CLIENT_ID',
      value: process.env.GOOGLE_CLIENT_ID,
      required: false,
    },
    clientSecret: {
      name: 'GOOGLE_CLIENT_SECRET',
      value: process.env.GOOGLE_CLIENT_SECRET,
      required: false,
    },
  },
};

let allConfigured = true;

// Check GitHub
console.log('📦 GitHub OAuth:');
const githubConfigured = checks.github.clientId.value && checks.github.clientSecret.value;
if (githubConfigured) {
  console.log('   ✅ Client ID: Configured');
  console.log('   ✅ Client Secret: Configured');
} else {
  console.log('   ⚠️  Client ID:', checks.github.clientId.value ? '✅' : '❌ Missing');
  console.log('   ⚠️  Client Secret:', checks.github.clientSecret.value ? '✅' : '❌ Missing');
  allConfigured = false;
}
console.log('');

// Check Google
console.log('📦 Google OAuth:');
const googleConfigured = checks.google.clientId.value && checks.google.clientSecret.value;
if (googleConfigured) {
  console.log('   ✅ Client ID: Configured');
  console.log('   ✅ Client Secret: Configured');
} else {
  console.log('   ⚠️  Client ID:', checks.google.clientId.value ? '✅' : '❌ Missing');
  console.log('   ⚠️  Client Secret:', checks.google.clientSecret.value ? '✅' : '❌ Missing');
  allConfigured = false;
}
console.log('');

// Check Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
console.log('🌐 Supabase Configuration:');
if (supabaseUrl) {
  console.log('   ✅ Supabase URL: Configured');
  console.log(`   URL: ${supabaseUrl}`);
} else {
  console.log('   ❌ Supabase URL: Missing');
  allConfigured = false;
}
console.log('');

// Instructions
if (!allConfigured) {
  console.log('📝 Setup Instructions:\n');
  
  if (!githubConfigured) {
    console.log('🔧 GitHub OAuth Setup:');
    console.log('1. Go to: https://github.com/settings/developers');
    console.log('2. Click "New OAuth App"');
    console.log('3. Set Application name: "Bookiji"');
    console.log('4. Set Homepage URL: http://localhost:3000 (or your production URL)');
    console.log('5. Set Authorization callback URL: http://localhost:3000/auth/callback');
    console.log('6. Copy Client ID and Client Secret');
    console.log('7. Add to .env.local:');
    console.log('   GITHUB_CLIENT_ID=your-client-id');
    console.log('   GITHUB_CLIENT_SECRET=your-client-secret');
    console.log('');
    console.log('8. In Supabase Dashboard:');
    console.log('   - Go to Authentication → Providers → GitHub');
    console.log('   - Enable GitHub provider');
    console.log('   - Paste Client ID and Client Secret');
    console.log('   - Add redirect URL: http://localhost:3000/auth/callback');
    console.log('');
  }
  
  if (!googleConfigured) {
    console.log('🔧 Google OAuth Setup:');
    console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
    console.log('2. Click "Create Credentials" → "OAuth client ID"');
    console.log('3. Set Application type: "Web application"');
    console.log('4. Set Name: "Bookiji"');
    console.log('5. Add Authorized redirect URIs:');
    console.log('   - http://localhost:3000/auth/callback');
    console.log('   - https://your-domain.com/auth/callback (for production)');
    console.log('6. Copy Client ID and Client Secret');
    console.log('7. Add to .env.local:');
    console.log('   GOOGLE_CLIENT_ID=your-client-id');
    console.log('   GOOGLE_CLIENT_SECRET=your-client-secret');
    console.log('');
    console.log('8. In Supabase Dashboard:');
    console.log('   - Go to Authentication → Providers → Google');
    console.log('   - Enable Google provider');
    console.log('   - Paste Client ID and Client Secret');
    console.log('   - Add redirect URL: http://localhost:3000/auth/callback');
    console.log('');
  }
  
  console.log('⚠️  Important:');
  console.log('- For local development: Configure in supabase/config.toml');
  console.log('- For production: Configure in Supabase Dashboard → Authentication → Providers');
  console.log('- Redirect URLs must match exactly in both OAuth provider and Supabase');
  console.log('');
  
  process.exit(1);
} else {
  console.log('✅ All OAuth providers are configured!');
  console.log('');
  console.log('📝 Next Steps:');
  console.log('1. Ensure redirect URLs are configured in Supabase Dashboard:');
  console.log('   - Go to Authentication → URL Configuration');
  console.log('   - Add: http://localhost:3000/auth/callback');
  console.log('   - Add your production URL if applicable');
  console.log('');
  console.log('2. Verify OAuth providers are enabled in Supabase Dashboard:');
  console.log('   - Go to Authentication → Providers');
  console.log('   - Enable GitHub and Google');
  console.log('   - Verify Client IDs and Secrets are set');
  console.log('');
  process.exit(0);
}

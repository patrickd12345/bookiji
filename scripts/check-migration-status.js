#!/usr/bin/env node

/**
 * Supabase Migration Status Checker
 * Run this to see which key model is currently active
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Supabase Migration Status Check\n');

// Check which keys are present
const newKeys = {
  url: process.env.SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  secretKey: process.env.SUPABASE_SECRET_KEY
};

const oldKeys = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

console.log('📋 Environment Variable Status:');
console.log('================================');

console.log('\n🆕 NEW MODEL:');
console.log(`   SUPABASE_URL: ${newKeys.url ? '✅ SET' : '❌ MISSING'}`);
console.log(`   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${newKeys.publishableKey ? '✅ SET' : '❌ MISSING'}`);
console.log(`   SUPABASE_SECRET_KEY: ${newKeys.secretKey ? '✅ SET' : '❌ MISSING'}`);

console.log('\n🔄 LEGACY MODEL:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${oldKeys.url ? '✅ SET' : '❌ MISSING'}`);
console.log(`   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${oldKeys.anonKey ? '✅ SET' : '❌ MISSING'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${oldKeys.serviceRoleKey ? '✅ SET' : '❌ MISSING'}`);

// Determine which model is active
const isNewModelActive = !!(newKeys.url && newKeys.publishableKey && newKeys.secretKey);
const isLegacyModelActive = !!(oldKeys.url && oldKeys.anonKey && oldKeys.serviceRoleKey);

console.log('\n🎯 ACTIVE MODEL:');
if (isNewModelActive) {
  console.log('   ✅ NEW MODEL ACTIVE - Using sb_publishable_ and sb_secret_ keys');
} else if (isLegacyModelActive) {
  console.log('   ⚠️  LEGACY MODEL ACTIVE - Using old anon/service_role keys');
} else {
  console.log('   ❌ INCOMPLETE - Missing required keys for either model');
}

// Show what the system will actually use
console.log('\n🔧 SYSTEM BEHAVIOR:');
if (newKeys.url) {
  console.log(`   URL: ${newKeys.url} (from SUPABASE_URL)`);
} else if (oldKeys.url) {
  console.log(`   URL: ${oldKeys.url} (from NEXT_PUBLIC_SUPABASE_URL)`);
}

if (newKeys.publishableKey) {
  console.log(`   Publishable Key: ${newKeys.publishableKey.substring(0, 20)}... (NEW MODEL)`);
} else if (oldKeys.anonKey) {
  console.log(`   Publishable Key: ${oldKeys.anonKey.substring(0, 20)}... (LEGACY MODEL)`);
}

if (newKeys.secretKey) {
  console.log(`   Secret Key: ${newKeys.secretKey.substring(0, 20)}... (NEW MODEL)`);
} else if (oldKeys.serviceRoleKey) {
  console.log(`   Secret Key: ${oldKeys.serviceRoleKey.substring(0, 20)}... (LEGACY MODEL)`);
}

console.log('\n💡 RECOMMENDATIONS:');
if (isNewModelActive) {
  console.log('   🎉 You can safely remove the legacy environment variables!');
  console.log('   🧹 Clean up: Remove legacy keys if still present');
} else if (isLegacyModelActive) {
  console.log('   ⚠️  Consider migrating to the new key model for future compatibility');
} else {
  console.log('   ❌ Fix missing environment variables before proceeding');
}

console.log('\n✨ Migration Status Check Complete!');

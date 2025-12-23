#!/usr/bin/env node
/**
 * Simple verification script for Support Module
 * Checks file existence and provides setup instructions
 */

import { existsSync } from 'fs';

console.log('🔍 Verifying Support Module Setup...\n');

// Check API Endpoints
console.log('1️⃣ Checking API Endpoints:');
const apiFiles = [
  'src/app/api/support/ask/route.ts',
  'src/app/api/support/kb-status/route.ts'
];

let allGood = true;
for (const file of apiFiles) {
  if (existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file}: Missing`);
    allGood = false;
  }
}

// Check Migrations
console.log('\n2️⃣ Checking Migrations:');
const migrationFiles = [
  'supabase/migrations/20251222240000_kb_crawler_fields.sql',
  'supabase/migrations/20251222250000_kb_search_include_url.sql',
  'supabase/migrations/20251222260000_kb_rag_usage_tracking.sql'
];

for (const file of migrationFiles) {
  if (existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file}: Missing`);
    allGood = false;
  }
}

// Check Scripts
console.log('\n3️⃣ Checking Scripts:');
const scripts = [
  'scripts/crawl-kb.ts',
  'scripts/test-rag-api.mjs'
];

for (const file of scripts) {
  if (existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file}: Missing`);
    allGood = false;
  }
}

// Check GitHub Actions
console.log('\n4️⃣ Checking GitHub Actions:');
if (existsSync('.github/workflows/support-kb-crawler.yml')) {
  console.log('   ✅ .github/workflows/support-kb-crawler.yml');
} else {
  console.log('   ❌ .github/workflows/support-kb-crawler.yml: Missing');
  allGood = false;
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ All files are in place!\n');
} else {
  console.log('⚠️  Some files are missing.\n');
}

console.log('📝 Next Steps to Run & Test:\n');
console.log('1. Set environment variables in .env:');
console.log('   - SUPABASE_URL');
console.log('   - SUPABASE_SERVICE_ROLE_KEY');
console.log('   - OPENAI_API_KEY');
console.log('   - NEXT_PUBLIC_APP_URL (optional)\n');

console.log('2. Apply database migrations:');
console.log('   npx supabase db push\n');

console.log('3. Run initial crawl (requires env vars):');
console.log('   pnpm tsx scripts/crawl-kb.ts\n');

console.log('4. Start dev server:');
console.log('   pnpm dev\n');

console.log('5. Test RAG API (in another terminal):');
console.log('   node scripts/test-rag-api.mjs "How do I book a service?"\n');

console.log('6. Check KB status:');
console.log('   curl http://localhost:3000/api/support/kb-status\n');

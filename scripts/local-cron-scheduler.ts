#!/usr/bin/env tsx
/**
 * Local Cron Scheduler for Development
 * 
 * Runs cron jobs locally during development.
 * Only runs when NODE_ENV=development
 * 
 * Usage:
 *   pnpm dev:cron
 * 
 * Or run alongside dev server:
 *   pnpm dev:cron & pnpm dev
 */

import cron from 'node-cron';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.VERCEL_CRON_SECRET || 'local-dev-secret';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'dev-admin-key';

// Only run in development
if (process.env.NODE_ENV === 'production') {
  console.log('⚠️  Local cron scheduler only runs in development mode');
  console.log('   In production, use Vercel Cron Jobs');
  process.exit(0);
}

console.log('🚀 Starting Local Cron Scheduler');
console.log(`   Base URL: ${BASE_URL}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');

// Helper to call cron endpoints
async function callCronEndpoint(path: string, description: string): Promise<void> {
  try {
    const url = `${BASE_URL}${path}`;
    console.log(`[${new Date().toISOString()}] Running: ${description}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log(`   ✅ Success: ${data.message || 'Completed'}`);
    } else {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.log(`   ⚠️  Warning: ${error.error || 'Failed'}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Schedule KB Auto-Deduplication: Every hour
cron.schedule('0 * * * *', async () => {
  await callCronEndpoint('/api/cron/kb-auto-dedupe', 'KB Auto-Deduplication');
}, {
  timezone: 'UTC',
});

console.log('   📅 Scheduled: KB Auto-Deduplication (every hour)');

// Schedule KB Crawl: Weekly on Mondays at 2 AM UTC
cron.schedule('0 2 * * 1', async () => {
  await callCronEndpoint('/api/cron/kb-crawl', 'KB Crawl');
}, {
  timezone: 'UTC',
});

console.log('   📅 Scheduled: KB Crawl (weekly, Mondays 2 AM UTC)');

// Schedule KB Ensure Embeddings: Every 6 hours
cron.schedule('0 */6 * * *', async () => {
  await callCronEndpoint('/api/cron/kb-ensure-embeddings', 'KB Ensure Embeddings (Vectorizing)');
}, {
  timezone: 'UTC',
});

console.log('   📅 Scheduled: KB Ensure Embeddings (every 6 hours)');

// Schedule Sitemap Refresh: Weekly on Mondays at 3 AM UTC (after KB crawl)
cron.schedule('0 3 * * 1', async () => {
  await callCronEndpoint('/api/cron/sitemap-refresh', 'Sitemap Refresh');
}, {
  timezone: 'UTC',
});

console.log('   📅 Scheduled: Sitemap Refresh (weekly, Mondays 3 AM UTC)');

// For development, also schedule a more frequent test crawl (every 6 hours)
if (process.env.LOCAL_CRON_TEST_MODE === 'true') {
  cron.schedule('0 */6 * * *', async () => {
    await callCronEndpoint('/api/cron/kb-crawl', 'KB Crawl (test mode)');
  }, {
    timezone: 'UTC',
  });
  console.log('   📅 Scheduled: KB Crawl Test Mode (every 6 hours)');
  
  // Also schedule sitemap refresh more frequently in test mode (daily)
  cron.schedule('0 3 * * *', async () => {
    await callCronEndpoint('/api/cron/sitemap-refresh', 'Sitemap Refresh (test mode)');
  }, {
    timezone: 'UTC',
  });
  console.log('   📅 Scheduled: Sitemap Refresh Test Mode (daily at 3 AM UTC)');
}

console.log('');
console.log('✅ Local cron scheduler is running');
console.log('   Press Ctrl+C to stop');
console.log('');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down local cron scheduler...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down local cron scheduler...');
  process.exit(0);
});

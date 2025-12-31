#!/usr/bin/env node
/**
 * Apply KB crawler migration directly via Supabase client
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Applying KB crawler migration...\n');
  
  const migrationSQL = `
    -- Add crawler fields to kb_articles
    ALTER TABLE public.kb_articles 
    ADD COLUMN IF NOT EXISTS content_hash text,
    ADD COLUMN IF NOT EXISTS last_crawled_at timestamptz;

    -- Add unique constraint on url for idempotent upserts
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.kb_articles'::regclass 
        AND conname = 'kb_articles_url_key'
      ) THEN
        ALTER TABLE public.kb_articles ADD CONSTRAINT kb_articles_url_key UNIQUE (url);
      END IF;
    END $$;

    -- Add index on url for faster lookups during crawl
    CREATE INDEX IF NOT EXISTS idx_kb_articles_url ON public.kb_articles(url);
  `;

  // Try to execute via Supabase REST API (limited, but works for simple SQL)
  // For complex migrations, user should run via Supabase dashboard or CLI
  console.log('⚠️  Note: Complex migrations should be run via Supabase dashboard SQL editor or CLI.');
  console.log('📋 Please run this SQL in your Supabase dashboard:\n');
  console.log(migrationSQL);
  console.log('\n💡 Or use: npx supabase db push (if authenticated)');
  console.log('\n✅ After applying, run: pnpm tsx scripts/crawl-kb.ts');
}

applyMigration().catch(console.error);














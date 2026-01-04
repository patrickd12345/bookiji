#!/usr/bin/env node
// @env-allow-legacy-dotenv
/**
 * Add unique constraint on kb_articles.url for crawler idempotency
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addConstraint() {
  console.log('🔧 Adding unique constraint on kb_articles.url...');
  
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conrelid = 'public.kb_articles'::regclass 
          AND conname = 'kb_articles_url_key'
        ) THEN
          ALTER TABLE public.kb_articles ADD CONSTRAINT kb_articles_url_key UNIQUE (url);
          RAISE NOTICE 'Constraint added';
        ELSE
          RAISE NOTICE 'Constraint already exists';
        END IF;
      END $$;
    `
  });

  if (error) {
    // Try direct SQL via PostgREST might not work, try alternative
    console.log('⚠️  RPC method failed, trying alternative...');
    // For now, just inform user to run migration
    console.log('✅ Please run: npx supabase db push');
    console.log('   Or manually add: ALTER TABLE kb_articles ADD CONSTRAINT kb_articles_url_key UNIQUE (url);');
  } else {
    console.log('✅ Constraint added successfully!');
  }
}

addConstraint().catch(console.error);















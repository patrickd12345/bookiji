// @env-allow-legacy-dotenv
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../src/config/supabase';

// Load .env.local first, then .env as fallback
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function verify() {
  console.log('🔍 Verifying KB Setup...\n');
  
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.secretKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }
  
  const supabase = createClient(cfg.url, cfg.secretKey);
  
  // Check articles
  const { data: articles, error: articlesError } = await supabase
    .from('kb_articles')
    .select('id, title, url')
    .limit(5);
  
  if (articlesError) {
    console.error('❌ Error fetching articles:', articlesError);
  } else {
    console.log(`✅ Found ${articles?.length || 0} article(s) in database`);
    if (articles && articles.length > 0) {
      console.log('   Sample articles:');
      articles.forEach(a => console.log(`   - ${a.title} (${a.url})`));
    }
  }
  
  // Check chunks
  const { data: chunks, error: chunksError } = await supabase
    .from('kb_article_chunks')
    .select('id')
    .limit(1);
  
  if (chunksError) {
    console.error('❌ Error fetching chunks:', chunksError);
  } else {
    const { count } = await supabase
      .from('kb_article_chunks')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Found ${count || 0} chunk(s) in database`);
  }
  
  // Check embeddings
  const { data: embeddings, error: embeddingsError } = await supabase
    .from('kb_embeddings')
    .select('chunk_id')
    .limit(1);
  
  if (embeddingsError) {
    console.error('❌ Error fetching embeddings:', embeddingsError);
  } else {
    const { count } = await supabase
      .from('kb_embeddings')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Found ${count || 0} embedding(s) in database`);
  }
  
  console.log('\n✅ KB Setup Verification Complete!');
  console.log('\n💡 To crawl more content, run:');
  console.log('   pnpm tsx scripts/crawl-kb.ts');
  console.log('\n💡 To test the RAG API, run:');
  console.log('   pnpm tsx scripts/test-rag-api.ts');
}

verify().catch(console.error);




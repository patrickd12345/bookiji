import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';

const config = getSupabaseConfig();
const supabase = createClient(config.url, config.secretKey!);

/**
 * Lightweight observability endpoint for KB crawler status
 * Returns: last crawl time, article count, chunk count
 */
export async function GET(req: NextRequest) {
  try {
    // Get last crawl timestamp (most recent last_crawled_at)
    const { data: lastCrawl, error: crawlError } = await supabase
      .from('kb_articles')
      .select('last_crawled_at')
      .order('last_crawled_at', { ascending: false })
      .limit(1)
      .single();

    // Get article count
    const { count: articleCount, error: countError } = await supabase
      .from('kb_articles')
      .select('*', { count: 'exact', head: true });

    // Get chunk count
    const { count: chunkCount, error: chunkCountError } = await supabase
      .from('kb_article_chunks')
      .select('*', { count: 'exact', head: true });

    // Get embeddings count (to verify vectorization)
    const { count: embeddingCount, error: embeddingCountError } = await supabase
      .from('kb_embeddings')
      .select('*', { count: 'exact', head: true });

    // Get last RAG usage timestamp
    const { data: lastRagUsage, error: ragError } = await supabase
      .from('kb_rag_usage')
      .select('used_at')
      .order('used_at', { ascending: false })
      .limit(1)
      .single();

    // Check if vectorization is complete (embeddings should match chunks)
    const safeChunkCount = chunkCount ?? 0
    const safeEmbeddingCount = embeddingCount ?? 0
    const isVectorized = safeEmbeddingCount === safeChunkCount && safeChunkCount > 0;

    return NextResponse.json({
      lastCrawlTime: lastCrawl?.last_crawled_at || null,
      lastRagTime: lastRagUsage?.used_at || null,
      articleCount: articleCount || 0,
      chunkCount: safeChunkCount,
      embeddingCount: safeEmbeddingCount,
      isVectorized: isVectorized,
      vectorizationStatus: isVectorized ? 'complete' : (safeEmbeddingCount === 0 ? 'not_started' : 'partial'),
      status: 'ok'
    });
  } catch (error) {
    console.error('KB observability error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch KB status',
      status: 'error' 
    }, { status: 500 });
  }
}


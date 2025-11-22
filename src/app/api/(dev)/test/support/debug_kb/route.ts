import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { embed } from '@/lib/support/embeddings';
import { searchKb } from '@/lib/support/rag';

export async function POST() {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error:'disabled' }, { status:403 });

  try {
    const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
    const admin = createClient(url, secretKey, { auth: { persistSession:false } });

    // Test 1: Check if KB articles exist
    const { data: articles, error: articlesError } = await admin
      .from('kb_articles')
      .select('*');
    
    if (articlesError) {
      return NextResponse.json({ error: 'Articles query failed', details: articlesError.message });
    }

    // Test 2: Check if KB chunks exist
    const { data: chunks, error: chunksError } = await admin
      .from('kb_chunks')
      .select('*');
    
    if (chunksError) {
      return NextResponse.json({ error: 'Chunks query failed', details: chunksError.message });
    }

    // Test 3: Test embeddings
    let embedding: number[];
    try {
      [embedding] = await embed(['test query']);
    } catch (e) {
      return NextResponse.json({ error: 'Embedding failed', details: String(e) });
    }

    // Test 4: Test KB search
    let searchResults: unknown;
    try {
      searchResults = await searchKb(admin, embedding, 3, 0.0);
    } catch (e) {
      return NextResponse.json({ error: 'KB search failed', details: String(e) });
    }

    return NextResponse.json({
      success: true,
      articles: articles?.length || 0,
      chunks: chunks?.length || 0,
      embedding_dimension: embedding?.length || 0,
      search_results: Array.isArray(searchResults) ? searchResults.length : 0,
      sample_chunk: chunks?.[0] || null,
      sample_article: articles?.[0] || null
    });

  } catch (e) {
    return NextResponse.json({ error: 'Debug failed', details: String(e) });
  }
}

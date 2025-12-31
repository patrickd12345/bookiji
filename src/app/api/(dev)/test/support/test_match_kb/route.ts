import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { embed } from '@/lib/support/embeddings';

export async function POST() {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error:'disabled' }, { status:403 });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { 
    auth: { persistSession:false },
    global: {
      fetch: fetch.bind(globalThis)
    }
  });

  try {
    // Test embedding
    const [vec] = await embed(['How do I reschedule my booking?']);
    console.warn('Embedding created with dimension:', vec.length);

    // Test match_kb function directly
    const { data, error } = await admin.rpc('match_kb', {
      query_embedding: vec,
      match_count: 6,
      min_sim: 0.60
    });

    if (error) {
      console.error('match_kb error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.warn('match_kb raw result:', data);
    
    return NextResponse.json({ 
      success: true,
      embedding_dimension: vec.length,
      results: data,
      count: Array.isArray(data) ? data.length : 0
    });

  } catch (e) {
    console.error('Test failed:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

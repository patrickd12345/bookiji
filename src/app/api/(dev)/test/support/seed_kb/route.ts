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

  const content = `You can reschedule a booking from your dashboard under "My Bookings" > "Reschedule". Changes allowed up to 24h before start time.`;
  const { data: existing } = await admin
    .from('kb_articles')
    .select('*')
    .eq('slug','reschedule-policy')
    .maybeSingle();

  let art = existing;
  if (!art) {
    const ins = await admin.from('kb_articles')
      .insert({ slug:'reschedule-policy', title:'Reschedule Policy', content })
      .select().single();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    art = ins.data;
  }

  let vec: number[];
  try {
    [vec] = await embed([content]);
    console.warn('Embedding created with dimension:', vec.length);
  } catch (e) {
    console.error('Embedding failed:', e);
    vec = new Array(768).fill(0);
  }
  
  // Check if chunk already exists
  const { data: existingChunk } = await admin
    .from('kb_chunks')
    .select('*')
    .eq('article_id', art.id)
    .eq('chunk_index', 0)
    .maybeSingle();
  
  if (existingChunk) {
    // Update existing chunk
    const chunkResult = await admin.from('kb_chunks')
      .update({ content, embedding: vec })
      .eq('id', existingChunk.id);
    
    if (chunkResult.error) {
      console.error('Chunk update failed:', chunkResult.error);
      return NextResponse.json({ error: chunkResult.error.message }, { status: 500 });
    }
  } else {
    // Insert new chunk
    const chunkResult = await admin.from('kb_chunks')
      .insert({ article_id: art.id, chunk_index: 0, content, embedding: vec });
    
    if (chunkResult.error) {
      console.error('Chunk insertion failed:', chunkResult.error);
      return NextResponse.json({ error: chunkResult.error.message }, { status: 500 });
    }
  }
  
  console.warn('Chunk created/updated successfully');

  return NextResponse.json({ ok: true });
}

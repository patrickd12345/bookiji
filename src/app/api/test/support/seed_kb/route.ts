import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { embed } from '@/lib/support/embeddings';

export async function POST() {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error:'disabled' }, { status:403 });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

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
  } catch (e) {
    vec = new Array(384).fill(0);
  }
  // upsert chunk 0 for idempotency
  await admin.from('kb_chunks')
    .upsert({ article_id: art.id, chunk_index: 0, content, embedding: vec }, { onConflict: 'article_id,chunk_index' });

  return NextResponse.json({ ok: true });
}

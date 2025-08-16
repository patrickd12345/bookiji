import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { getAgentFromAuth } from '@/lib/auth/agent';
import { embed } from '@/lib/support/embeddings';

export async function GET(req: Request) {
  const agent = await getAgentFromAuth(req);
  if (!agent) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession: false } });

  const { data, error } = await admin.from('kb_candidates').select('*').eq('status', 'pending').limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ candidates: data });
}

export async function POST(req: Request) {
  const agent = await getAgentFromAuth(req);
  if (!agent) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id, action } = await req.json();
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession: false } });

  if (action === 'reject') {
    await admin.from('kb_candidates').update({ status: 'rejected', rejected_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ ok: true });
  }

  // approve: move into kb
  const { data: c } = await admin.from('kb_candidates').select('*').eq('id', id).single();
  if (!c) return NextResponse.json({ error: 'candidate not found' }, { status: 404 });

  const { data: art, error: err } = await admin.from('kb_articles')
    .insert({ slug: `auto-${c.id}`, title: c.question, content: c.answer })
    .select()
    .single();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const [vec] = await embed([c.answer]);
  await admin.from('kb_chunks').insert({
    article_id: art.id,
    chunk_index: 0,
    content: c.answer,
    embedding: vec
  });

  await admin.from('kb_candidates').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);

  return NextResponse.json({ ok: true });
}



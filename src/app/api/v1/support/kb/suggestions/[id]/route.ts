import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { getAgentFromAuth } from '@/lib/auth/agent';

async function appendChunk(admin: SupabaseClient, articleId: string, content: string, embed: (t:string[])=>Promise<number[][]>) {
  const [vec] = await embed([content]);
  const { data: last } = await admin.from('kb_chunks')
    .select('chunk_index').eq('article_id', articleId).order('chunk_index', { ascending:false }).limit(1).maybeSingle();
  const nextIdx = (last?.chunk_index ?? -1) + 1;
  await admin.from('kb_chunks').insert({ article_id: articleId, chunk_index: nextIdx, content, embedding: vec });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const payload = await req.json();
  const { action, articleId }:{ action:'approve'|'reject'|'link', articleId?:string } = payload;

  const { data: sug, error } = await admin.from('kb_suggestions').select('*').eq('id', params.id).single();
  if (error || !sug) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (action === 'reject') {
    await admin.from('kb_suggestions').update({ status: 'rejected' }).eq('id', sug.id);
    console.info('support.kb_suggest.rejected', { suggestion_id: sug.id });
    return NextResponse.json({ ok: true });
  }

  if (action === 'link' && articleId) {
    await appendChunk(admin, articleId, sug.answer, (t)=>import('@/lib/support/embeddings').then(m=>m.embed(t)));
    await admin.from('kb_suggestions').update({ status:'approved', target_article_id: articleId }).eq('id', sug.id);
    console.info('support.kb_suggest.approved', { suggestion_id: sug.id, article_id: articleId });
    return NextResponse.json({ ok: true, articleId });
  }

  // default approve => create new article
  const { data: art, error: e2 } = await admin.from('kb_articles')
    .insert({ slug: `kb-${sug.id}`, title: sug.question, content: sug.answer })
    .select().single();
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  await appendChunk(admin, art.id, sug.answer, (t)=>import('@/lib/support/embeddings').then(m=>m.embed(t)));
  await admin.from('kb_suggestions').update({ status:'approved', target_article_id: art.id }).eq('id', sug.id);
  console.info('support.kb_suggest.approved', { suggestion_id: sug.id, article_id: art.id, new_article: true });
  return NextResponse.json({ ok: true, articleId: art.id });
}

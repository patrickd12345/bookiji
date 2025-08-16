import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { getAgentFromAuth } from '@/lib/auth/agent';
import { embed } from '@/lib/support/embeddings';
import { searchKb } from '@/lib/support/rag';

export async function GET(req: Request) {
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  const q = new URL(req.url).searchParams.get('q') ?? '';
  if (!q) return NextResponse.json({ results: [] });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const [vec] = await embed([q]);
  const hits = await searchKb(admin, vec, 6, 0.60);
  return NextResponse.json({ results: hits.map(h => ({ title: 'KB', excerpt: h.content, url: null, confidence: h.similarity })) });
}

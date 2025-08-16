import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { getAgentFromAuth } from '@/lib/auth/agent';

export async function GET(req: Request) {
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const u = new URL(req.url);
  const status = u.searchParams.get('status') ?? 'open';
  const intent = u.searchParams.get('intent');
  const priority = u.searchParams.get('priority');
  const limit = Math.min(parseInt(u.searchParams.get('limit') ?? '20', 10), 100);

  let q = admin.from('support_tickets').select('*').eq('status', status).order('created_at', { ascending: false }).limit(limit);
  if (intent) q = q.eq('intent', intent);
  if (priority) q = q.eq('priority', priority);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data });
}

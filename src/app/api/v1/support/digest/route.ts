import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { getAgentFromAuth } from '@/lib/auth/agent';

export async function GET(req: Request) {
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  const win = new URL(req.url).searchParams.get('window') ?? '24h';
  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const { data, error } = await admin
    .from('support_tickets')
    .select('intent,status,created_at')
    .gte('created_at', new Date(Date.now() - parseWindow(win)).toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const r of data ?? []) {
    const k = `${r.intent}/${r.status}`;
    counts[k] = (counts[k] || 0) + 1;
  }
  const summary = `Tickets last ${win}: ${data?.length ?? 0}`;
  return NextResponse.json({ summary, counts });
}

function parseWindow(win: string) {
  const m = /^([0-9]+)([hd])$/.exec(win) || ['', '24', 'h'];
  const n = Number(m[1]);
  return (m[2] === 'd' ? n*24 : n) * 60 * 60 * 1000;
}

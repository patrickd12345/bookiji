import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';

export async function GET() {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ ok: 'disabled' });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession: false } });

  const { data: tickets } = await admin.from('support_tickets')
    .select('id,subject,body')
    .eq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(10);

  for (const t of tickets ?? []) {
    const { data: exists } = await admin.from('kb_candidates').select('id').eq('ticket_id', t.id).maybeSingle();
    if (!exists) {
      await admin.from('kb_candidates').insert({
        ticket_id: t.id,
        question: t.subject,
        answer: t.body
      });
    }
  }
  return NextResponse.json({ ok: true });
}



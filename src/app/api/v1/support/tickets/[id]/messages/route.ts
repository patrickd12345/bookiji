import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { getAgentFromAuth } from '@/lib/auth/agent';
import { sendSupportEmail } from '@/lib/services/notificationQueue';

async function ensureConversationId(admin: any, ticketId: string) {
  const { data: found } = await admin.from('support_conversations').select('id').eq('id', ticketId).single();
  if (found?.id) return found.id;
  const { data, error } = await admin.from('support_conversations').insert({ id: ticketId, origin: 'chat' }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const convId = await ensureConversationId(admin, params.id);
  const { data, error } = await admin.from('support_messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  const { text, public: isPublic, sendEmail = true } = await req.json();
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const convId = await ensureConversationId(admin, params.id);
  await admin.from('support_messages').insert({ conversation_id: convId, role: 'agent', text, intent: null, confidence: null, meta: { public: !!isPublic } });

  if (isPublic && sendEmail) {
    const { data: t } = await admin.from('support_tickets').select('email,subject').eq('id', params.id).single();
    if (t?.email) await sendSupportEmail(t.email, `Re: ${t.subject}`, text);
  }
  return NextResponse.json({ ok: true });
}

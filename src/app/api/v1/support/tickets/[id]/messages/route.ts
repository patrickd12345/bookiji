import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { getAgentFromAuth } from '@/lib/auth/agent';
import { sendSupportEmail } from '@/lib/services/notificationQueue';

// Simple in-memory rate limiter for support messages
const messageRateLimit = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 messages per minute per agent

async function ensureConversationId(admin: SupabaseClient, ticketId: string) {
  // Try by ticket_id first
  const byTicket = await admin
    .from('support_conversations')
    .select('id')
    .eq('ticket_id', ticketId)
    .maybeSingle();
  if (byTicket.data?.id) return byTicket.data.id;

  // Fallback: some schemas used conversation id = ticket id
  const byId = await admin
    .from('support_conversations')
    .select('id')
    .eq('id', ticketId)
    .maybeSingle();
  if (byId.data?.id) return byId.data.id;

  // Create using ticket_id
  const ins = await admin
    .from('support_conversations')
    .insert({ ticket_id: ticketId })
    .select('id')
    .single();
  if (ins.error) throw ins.error;
  return ins.data.id;
}

export async function GET(
  req: Request,
  context: { params: Promise<Record<string, string>> }
) {
  const { id } = await context.params;
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const convId = await ensureConversationId(admin, id);
  const { data, error } = await admin.from('support_messages')
    .select('id, conversation_id, sender_type, content, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(
  req: Request,
  context: { params: Promise<Record<string, string>> }
) {
  const { id } = await context.params;
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  // Rate limiting check
  const agentId = agent.id;
  const now = Date.now();
  const entry = messageRateLimit.get(agentId) || { count: 0, reset: now + RATE_LIMIT_WINDOW };

  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + RATE_LIMIT_WINDOW;
  }

  entry.count += 1;
  messageRateLimit.set(agentId, entry);

  if (entry.count > RATE_LIMIT_MAX) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded. Please wait before sending more messages.',
      retryAfter: Math.ceil((entry.reset - now) / 1000)
    }, { status: 429 });
  }

  const { text, public: isPublic, sendEmail = true } = await req.json();
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const convId = await ensureConversationId(admin, id);
  const ins = await admin.from('support_messages').insert({ conversation_id: convId, sender_type: 'agent', content: text });
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  if (isPublic && sendEmail) {
    const { data: t } = await admin.from('support_tickets').select('email,subject').eq('id', id).single();
    if (t?.email) await sendSupportEmail(t.email, `Re: ${t.subject}`, text);
  }
  return NextResponse.json({ ok: true });
}

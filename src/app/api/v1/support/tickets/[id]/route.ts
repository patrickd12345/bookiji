import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { getAgentFromAuth } from '@/lib/auth/agent';
import { redactPII } from '@/lib/support/redact';
import { qaFromTranscript } from '@/lib/support/summarize';
import { embed } from '@/lib/support/embeddings';
import { searchKb } from '@/lib/support/rag';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const { data, error } = await admin.from('support_tickets').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

async function buildTranscript(admin: ReturnType<typeof createClient>, ticketId: string) {
  const { data: conv } = await admin.from('support_conversations').select('id').eq('id', ticketId).single();
  if (!conv?.id) return [];
  const { data: msgs } = await admin.from('support_messages')
    .select('role,text').eq('conversation_id', conv.id).order('created_at', { ascending: true });
  return (msgs ?? []).map(m => ({ 
    role: (m.role === 'user' || m.role === 'agent' || m.role === 'assistant') 
      ? m.role as 'user' | 'agent' | 'assistant'
      : 'assistant',
    text: String(m.text || '')
  }));
}

async function maybeCreateKbSuggestion(
  admin: ReturnType<typeof createClient>, ticketId: string, intent?: string) {
  
  // Check if feature is enabled
  if (process.env.SUPPORT_KB_SUGGEST_ENABLED !== 'true') return;

  const transcript = await buildTranscript(admin, ticketId);
  if (!transcript.length) return;

  // Distill and redact
  const qa = await qaFromTranscript(transcript);
  const question = redactPII(qa.question);
  const answer   = redactPII(qa.answer);

  // Embeddings
  const [qEmb] = await embed([question]);
  const [aEmb] = await embed([answer]);

  // Nearest match to existing KB to estimate duplication
  // Type assertion to make SupabaseClient compatible
  const hits = await searchKb(admin as any, qEmb, 1, 0.0);
  const similarity = hits[0]?.similarity ?? 0;
  
  // Threshold from env or default
  const dupThreshold = Number(process.env.SUPPORT_KB_DUP_THRESHOLD ?? 0.90);

  // Heuristic: mark immediate duplicate if ≥ threshold (tune later)
  const status = similarity >= dupThreshold ? 'duplicate' : 'pending';
  const target_article_id = similarity >= dupThreshold ? hits[0].article_id : null;

  await admin.from('kb_suggestions').insert({
    ticket_id: ticketId,
    question, answer,
    intent: intent ?? null,
    similarity_to_best: similarity,
    status, target_article_id,
    q_embedding: qEmb,
    a_embedding: aEmb
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  const payload = await req.json();
  const patch: Record<string, any> = {};
  if (payload.status) patch.status = payload.status;
  if (payload.priority) patch.priority = payload.priority;

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const before = await admin.from('support_tickets').select('status,intent').eq('id', params.id).single();
  // apply update
  const { data, error } = await admin.from('support_tickets').update(patch).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // If status transitioned to resolved → attempt suggestion
  if ((before.data?.status !== 'resolved') && data?.status === 'resolved') {
    try { 
      await maybeCreateKbSuggestion(admin as any, params.id, data?.intent); 
      // Add counter for observability
      console.info('support.kb_suggest.created', { ticket_id: params.id });
    } catch (e) {
      console.error('Failed to create KB suggestion', { ticket_id: params.id, error: e });
    }
  }
  return NextResponse.json(data);
}

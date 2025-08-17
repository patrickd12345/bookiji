import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { getAgentFromAuth } from '@/lib/auth/agent';
import { redactPII } from '@/lib/support/redact';
import { qaFromTranscript } from '@/lib/support/summarize';
import { embed } from '@/lib/support/embeddings';
import { searchKb } from '@/lib/support/rag';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const { data, error } = await admin.from('support_tickets').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

async function buildTranscript(admin: ReturnType<typeof createClient>, ticketId: string) {
  const { data: conv } = await admin
    .from('support_conversations')
    .select('id')
    .eq('ticket_id', ticketId)
    .single();
  if (!conv?.id) return [];
  const { data: msgs } = await admin
    .from('support_messages')
    .select('sender_type,content')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });
  return (msgs ?? []).map(m => ({ 
    role: (m.sender_type === 'user' ? 'user' : 'agent') as 'user' | 'agent' | 'assistant',
    text: String(m.content || '')
  }));
}

async function maybeCreateKbSuggestion(
  admin: ReturnType<typeof createClient>, ticketId: string, intent?: string) {
  
  // Enable by default in non-production unless explicitly disabled
  const enabled = (process.env.SUPPORT_KB_SUGGEST_ENABLED ?? (process.env.NODE_ENV !== 'production' ? 'true' : 'false')) === 'true';
  if (!enabled) { console.info('kb_suggest: disabled'); return; }

  // Fetch ticket for fallback context
  const { data: ticketRow } = await admin.from('support_tickets').select('subject,body').eq('id', ticketId).single();

  const insertFallback = async (reason: string) => {
    const question = String(ticketRow?.subject || ticketRow?.body || 'Support question').slice(0, 120);
    const answer = 'We identified this as a frequent support question. Team will document the exact policy answer.';
    const ins = await admin.from('kb_suggestions').insert({
      ticket_id: ticketId,
      question, answer,
      intent: intent ?? null,
      similarity_to_best: 0,
      status: 'pending'
    }).select('id,status');
    console.info('kb_suggest: fallback inserted', reason, ins.data, ins.error);
    return;
  };

  const transcript = await buildTranscript(admin, ticketId);
  console.info('kb_suggest: transcript_len', transcript.length);
  if (!transcript.length) return insertFallback('no_transcript');

  try {
    // Distill and redact
    const qa = await qaFromTranscript(transcript);
    const question = redactPII(qa.question);
    const answer   = redactPII(qa.answer);
    console.info('kb_suggest: qa', { q: question.slice(0,80), a: answer.slice(0,80) });

    // Embeddings
    const [qEmb] = await embed([question]);
    const [aEmb] = await embed([answer]);

    // Nearest match to existing KB to estimate duplication
    const hits = await searchKb(admin, qEmb, 1, 0.0);
    const similarity = hits[0]?.similarity ?? 0;
    console.info('kb_suggest: best_sim', similarity);
    
    // Threshold from env or default
    const dupThreshold = Number(process.env.SUPPORT_KB_DUP_THRESHOLD ?? 0.90);

    // Heuristic: mark immediate duplicate if ≥ threshold (tune later)
    const status = similarity >= dupThreshold ? 'duplicate' : 'pending';
    const target_article_id = similarity >= dupThreshold ? hits[0].article_id : null;

    const ins = await admin.from('kb_suggestions').insert({
      ticket_id: ticketId,
      question, answer,
      intent: intent ?? null,
      similarity_to_best: similarity,
      status, target_article_id,
      q_embedding: qEmb,
      a_embedding: aEmb
    }).select('id,status');
    console.info('kb_suggest: inserted', ins.data, ins.error);
    if (ins.error) throw ins.error;
  } catch (e) {
    console.error('kb_suggest: error, using fallback', e);
    return insertFallback('exception');
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgentFromAuth(req);
  if (!agent?.roles?.includes('support_agent')) return NextResponse.json({ error:'forbidden' }, { status:403 });

  const payload = await req.json();
  const patch: Record<string, string> = {};
  if (payload.status) patch.status = payload.status;
  if (payload.priority) patch.priority = payload.priority;

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession:false } });

  const before = await admin.from('support_tickets').select('status,intent,subject').eq('id', id).single();
  // apply update
  const { data, error } = await admin.from('support_tickets').update(patch).eq('id', id).select('id,intent,subject,status').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // If status transitioned to resolved → attempt suggestion
  if ((before.data?.status !== 'resolved') && data?.status === 'resolved') {
    const subjectSafe = data?.subject ? String(data.subject) : '';
    const intentSafe = data?.intent ?? null;

    // Immediate minimal suggestion to satisfy downstream flows
    await admin.from('kb_suggestions').insert({
      ticket_id: id,
      question: (subjectSafe || 'Support question').slice(0, 120),
      answer: 'Thanks for reaching out. Our team will add a definitive KB answer shortly.',
      intent: intentSafe,
      similarity_to_best: 0,
      status: 'pending'
    });

    try { 
      await maybeCreateKbSuggestion(admin, id, intentSafe); 
      console.info('support.kb_suggest.created', { ticket_id: id });
    } catch (e) {
      console.error('Failed to enrich KB suggestion', { ticket_id: id, error: e });
    }

    // Attach latest suggestion id for this ticket
    const latest = await admin
      .from('kb_suggestions')
      .select('id,status')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    (data as { createdSuggestionId?: string | null; createdSuggestionStatus?: string | null }).createdSuggestionId = latest.data?.id ?? null;
    (data as { createdSuggestionId?: string | null; createdSuggestionStatus?: string | null }).createdSuggestionStatus = latest.data?.status ?? null;

    // Also create a kb_candidate record for agent approval pipeline
    try {
      const { data: t } = await admin
        .from('support_tickets')
        .select('id,subject,body')
        .eq('id', id)
        .single();

      // Find the conversation to read the last agent message
      const { data: conv } = await admin
        .from('support_conversations')
        .select('id')
        .eq('ticket_id', id)
        .single();

      let agentAnswer: string | null = null;
      if (conv?.id) {
        const { data: m } = await admin
          .from('support_messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .eq('sender_type', 'agent')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        agentAnswer = m?.content ? String(m.content) : null;
      }

      if (t) {
        await admin.from('kb_candidates').insert({
          ticket_id: t.id,
          question: String(t.subject || 'Support question'),
          answer: String(agentAnswer || t.body || 'Thanks for reaching out. Our team will add a definitive KB answer shortly.')
        });
      }
    } catch (e) {
      console.error('kb_candidates insert failed', { ticket_id: id, error: e });
    }
  }
  return NextResponse.json(data);
}

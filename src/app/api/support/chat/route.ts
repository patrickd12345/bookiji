import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { classifyIntent } from '@/lib/support/intents';
import { getLLMService, getEmbeddingService } from '@/lib/support/llm-service';
import { sendSupportEmail } from '@/lib/services/notificationQueue';

const cfg = {
  LOW: Number(process.env.SUPPORT_MIN_CONF_LOW ?? 0.60),
  OK: Number(process.env.SUPPORT_MIN_CONF_OK ?? 0.75),
  MAX_LOW_STREAK: Number(process.env.SUPPORT_MAX_LOW_STREAK ?? 2)
};

const RESTRICTED = /(refund|chargeback|id|verify|passport|fraud|legal|privacy|gdpr)/i;

async function getAdmin() {
  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  
  if (!url || !secretKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(url, secretKey, { 
    auth: { persistSession: false },
    global: {
      fetch: fetch.bind(globalThis)
    }
  });
}

export async function POST(req: Request) {
  try {
    const { message, email, history = [] } = await req.json().catch(() => ({}));
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const intent = classifyIntent(message);
    const admin = await getAdmin();
    
    // Initialize LLM and embedding services
    const llmService = getLLMService();
    const embeddingService = getEmbeddingService();
    
    let chunks: any[] = [];
    let top = 0;
    
    try {
      // 1. Generate embedding for the query
      const embedding = await embeddingService.getEmbedding(message);
      
      // 2. Search vector store using RPC function
      const { data: searchResults, error: searchError } = await admin.rpc('kb_search', {
        q_embedding: embedding,
        k: 5
      });
      
      if (searchError) {
        console.error('Vector search error:', searchError);
        throw searchError;
      }
      
      if (searchResults && searchResults.length > 0) {
        chunks = searchResults;
        top = chunks[0]?.score ?? 0;
      }
      
      console.log('KB search results:', { chunks: chunks.length, top, firstChunk: chunks[0] });
    } catch (e) {
      console.error('KB search failed:', e);
      // If KB search fails, escalate the ticket
      chunks = [];
      top = 0;
    }

    const lastScores = (history as Array<{ confidence?: number }>).map(h => h.confidence).filter((x): x is number => typeof x === 'number');
    const recent = [...lastScores.slice(-1), top];
    const lowStreak = recent.filter(s => s < cfg.OK).length >= cfg.MAX_LOW_STREAK;
    const restricted = RESTRICTED.test(message);

    // Apply similarity threshold guardrail
    const SIMILARITY_THRESHOLD = parseFloat(process.env.SUPPORT_KB_SIMILARITY_THRESHOLD || '0.7');
    const validChunks = chunks.filter((c: any) => c.score >= SIMILARITY_THRESHOLD);
    
    // Debug logging
    console.log('Support chat debug:', {
      top,
      cfg_LOW: cfg.LOW,
      cfg_OK: cfg.OK,
      lowStreak,
      restricted,
      chunksLength: chunks.length,
      validChunksLength: validChunks.length,
      similarityThreshold: SIMILARITY_THRESHOLD,
      mustEscalate: top < cfg.LOW || lowStreak || restricted || validChunks.length === 0
    });

    // Only escalate if confidence is too low, there's a low streak, content is restricted, or no valid chunks
    const mustEscalate = top < cfg.LOW || lowStreak || restricted || validChunks.length === 0;

    if (!mustEscalate && validChunks.length > 0) {
      // Construct context from valid chunks
      const contextText = validChunks.map((c: any) => c.snippet).join('\n---\n');
      
      // Generate answer using LLM with strict guardrails
      const systemPrompt = `You are the Bookiji Support Bot. Answer the user strictly using ONLY the context provided below. 
    
CRITICAL RULES:
- If the answer is NOT in the context, respond EXACTLY: "I don't have enough information to answer that based on the current documentation."
- Do NOT make up information, speculate, or use knowledge outside the provided context.
- Cite specific details from the context when available.
- Keep answers concise and helpful.
- Be friendly and conversational.

Context:
${contextText}
`;

      let answer: string;
      try {
        answer = await llmService.generateAnswer(systemPrompt, message) || "I don't have enough information to answer that based on the current documentation.";
        console.log('Generated LLM answer:', { answer: answer.substring(0, 100), confidence: top });
      } catch (llmError) {
        console.error('LLM generation failed:', llmError);
        // Fallback to best chunk if LLM fails
        answer = validChunks[0]?.snippet || "I'm having trouble processing your question right now. Please try again later.";
      }

      // Persist lightweight conversation for suggestion engine
      try {
        // Create ticket for traceability even if not escalated
        const t = await admin.from('support_tickets').insert({
          email: email ?? null,
          subject: message.slice(0, 80),
          body: message,
          intent,
          priority: 'normal',
          status: 'resolved'
        }).select('id').single();
        if (!t.error && t.data?.id) {
          // ensure conversation and write messages
          const conv = await admin.from('support_conversations')
            .insert({ ticket_id: t.data.id })
            .select('id').single();
          if (!conv.error && conv.data?.id) {
            await admin.from('support_messages').insert([
              { conversation_id: conv.data.id, sender_type: 'user', content: message },
              { conversation_id: conv.data.id, sender_type: 'agent', content: answer }
            ]);
          }
        }
      } catch (e) {
        console.warn('Non-fatal: failed to persist kb conversation', e);
      }

      // Get sources for citation
      const sources = validChunks
        .map((c: any) => ({
          title: c.title,
          url: c.url || null,
          score: c.score
        }))
        .filter((s: any, i: number, arr: any[]) => 
          arr.findIndex((x: any) => x.url === s.url) === i // Dedupe by URL
        );

      return NextResponse.json({ 
        reply: answer, 
        intent, 
        confidence: top,
        source: 'kb',
        sources: sources.slice(0, 3) // Return top 3 sources
      });
    }

    // auto-escalate (no CTA)
    const ticketIns = await admin.from('support_tickets').insert({
      email: email ?? null,
      subject: message.slice(0, 80),
      body: message,
      intent,
      priority: restricted ? 'high' : 'normal',
      status: 'open'
    }).select().single();
    
    if (ticketIns.error) throw ticketIns.error;
    const ticket = ticketIns.data;

    // Persist conversation with the initial user message to enable suggestion generation later
    try {
      const conv = await admin.from('support_conversations')
        .insert({ ticket_id: ticket.id })
        .select('id').single();
      if (!conv.error && conv.data?.id) {
        await admin.from('support_messages').insert([
          { conversation_id: conv.data.id, sender_type: 'user', content: message },
          { conversation_id: conv.data.id, sender_type: 'agent', content: 'Thanks, we are escalating this to our support team.' }
        ]);
      }
    } catch (e) {
      console.warn('Non-fatal: failed to persist escalated conversation', e);
    }

    if (email) {
      try {
        await sendSupportEmail(process.env.SUPPORT_ESCALATION_EMAIL!,
          `New ticket ${ticket.id}`, `User: ${email}\nIntent: ${intent}\nMessage: ${message}`);
      } catch (e) {
        console.error('Failed to send support email:', e);
      }
    }

    return NextResponse.json({
      reply: `I'm forwarding this to our support team now. Your ticket ID is ${ticket.id}. We'll email you as soon as possible.`,
      escalated: true,
      ticketId: ticket.id
    });
  } catch (e) {
    console.error('Support chat error:', e);
    // Graceful fallback: respond with generic guidance instead of 500
    const reply = 'Thanks for the message. Please check My Bookings in your dashboard to reschedule or cancel. If this persists, reply with your email and we\'ll create a support ticket for you.';
    return NextResponse.json({ reply, escalated: false, intent: 'general', confidence: 0.0 });
  }
}

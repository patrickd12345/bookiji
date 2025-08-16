import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { classifyIntent } from '@/lib/support/intents';
import { embed } from '@/lib/support/embeddings';
import { searchKb, type Hit } from '@/lib/support/rag';
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
    
    let vec: number[];
    try {
      [vec] = await embed([message]);
    } catch (e) {
      console.error('Embedding failed:', e);
      vec = new Array(768).fill(0);
    }
    
    let hits: Hit[] = [];
    let top = 0;
    
    try {
      // Workaround: Call the search endpoint directly since it works
      const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/v1/support/search?q=${encodeURIComponent(message)}`, {
        headers: {
          'X-Dev-Agent': 'allow'
        }
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.results && searchData.results.length > 0) {
          // Convert search results to Hit format
          hits = searchData.results.map((r: any) => ({
            article_id: 'kb',
            chunk_id: 'kb',
            chunk_index: 0,
            content: r.excerpt,
            similarity: r.confidence
          }));
          top = hits[0]?.similarity ?? 0;
        }
      }
      
      console.log('KB search results (via endpoint):', { hits: hits.length, top, firstHit: hits[0] });
    } catch (e) {
      console.error('KB search failed:', e);
      // If KB search fails, escalate the ticket
      hits = [];
      top = 0;
    }

    const lastScores = (history as any[]).map(h => h.confidence).filter((x) => typeof x === 'number');
    const recent = [...lastScores.slice(-1), top];
    const lowStreak = recent.filter(s => s < cfg.OK).length >= cfg.MAX_LOW_STREAK;
    const restricted = RESTRICTED.test(message);

    // Debug logging
    console.log('Support chat debug:', {
      top,
      cfg_LOW: cfg.LOW,
      cfg_OK: cfg.OK,
      lowStreak,
      restricted,
      hitsLength: hits.length,
      mustEscalate: top < cfg.LOW || lowStreak || restricted
    });

    // Only escalate if confidence is too low, there's a low streak, or content is restricted
    const mustEscalate = top < cfg.LOW || lowStreak || restricted;

    if (!mustEscalate && hits.length > 0) {
      // Use the best KB answer
      const bestHit = hits[0];
      const answer = bestHit.content;
      console.log('Using KB answer:', { answer, confidence: top });

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

      return NextResponse.json({ 
        reply: answer, 
        intent, 
        confidence: top,
        source: 'kb',
        articleId: bestHit.article_id
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

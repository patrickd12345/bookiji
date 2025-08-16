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
      hits = await searchKb(admin, vec, 6, cfg.LOW);
      top = hits[0]?.similarity ?? 0;
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

    const mustEscalate = top < cfg.LOW || lowStreak || restricted || hits.length === 0;

    if (!mustEscalate) {
      const answer = hits.slice(0,3).map((h,i)=>`${i+1}. ${h.content}`).join('\n');
      return NextResponse.json({ reply: answer, intent, confidence: top });
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

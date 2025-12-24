import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { classifyIntent } from '@/lib/support/intents';
import { getLLMService, getEmbeddingService } from '@/lib/support/llm-service';
import { sendSupportEmail } from '@/lib/services/notificationQueue';
import { getAuthenticatedUserId } from '@/app/api/_utils/auth';

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

// Add timeout configuration
const API_TIMEOUT = 25000; // 25 seconds (less than client timeout)

export async function POST(req: Request) {
  // Set a timeout for the entire request
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), API_TIMEOUT);
  });

  try {
    // Race between the actual work and timeout
    return await Promise.race([
      handleRequest(req),
      timeoutPromise
    ]) as NextResponse;
  } catch (e) {
    console.error('❌ Support chat outer error handler:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    
    if (errorMessage.includes('timeout')) {
      return NextResponse.json({ 
        reply: 'The request took too long to process. Please try again with a shorter question.', 
        escalated: false, 
        intent: 'general', 
        confidence: 0.0 
      }, { status: 504 });
    }
    
    // Check if it's a configuration error (missing API keys)
    const isConfigError = errorMessage.includes('API_KEY') || 
                         errorMessage.includes('required') ||
                         errorMessage.includes('GEMINI_API_KEY') ||
                         errorMessage.includes('OPENAI_API_KEY');
    
    if (isConfigError) {
      console.error('❌ LLM configuration error - missing API keys. Please set GEMINI_API_KEY or OPENAI_API_KEY.');
      return NextResponse.json({ 
        reply: 'I apologize, but the AI support system is not properly configured. Please contact support directly or check your environment configuration.', 
        escalated: false, 
        intent: 'general', 
        confidence: 0.0,
        error: 'LLM_NOT_CONFIGURED'
      });
    }
    
    // Log the full error for debugging
    console.error('Full error object:', {
      message: errorMessage,
      stack: e instanceof Error ? e.stack : undefined,
      error: e
    });
    
    // Graceful fallback: try to provide helpful guidance
    const reply = 'I\'m having trouble processing your request right now. Could you please provide more details about what you need help with? For booking-related questions, you can check your dashboard. If this persists, we\'ll create a support ticket for you.';
    return NextResponse.json({ reply, escalated: false, intent: 'general', confidence: 0.0 });
  }
}

async function handleRequest(req: Request) {
  try {
    const { message, email, history = [] } = await req.json().catch(() => ({}));
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    // Get authenticated user ID (if available)
    const userId = await getAuthenticatedUserId(req);
    console.log('📨 Received support chat request:', { 
      message: message.substring(0, 50), 
      hasEmail: !!email,
      hasUserId: !!userId 
    });

    const intent = classifyIntent(message);
    console.log('🎯 Classified intent:', intent);
    
    // Handle common onboarding queries with helpful responses
    const onboardingPhrases = ['get me started', 'get started', 'how do i start', 'how to start', 'getting started', 'new user', 'first time', 'onboarding'];
    const isOnboardingQuery = onboardingPhrases.some(phrase => message.toLowerCase().includes(phrase));
    
    let admin;
    try {
      admin = await getAdmin();
      console.log('✅ Admin client initialized');
    } catch (adminError) {
      console.error('❌ Failed to initialize admin client:', adminError);
      throw new Error('Database connection failed');
    }
    
    // Initialize LLM and embedding services
    let llmService;
    let embeddingService;
    try {
      const provider = process.env.SUPPORT_LLM_PROVIDER || 'gemini';
      const embeddingProvider = process.env.SUPPORT_EMBEDDING_PROVIDER || 'openai';
      console.log('🔧 Initializing LLM services:', { 
        llmProvider: provider, 
        embeddingProvider,
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasGroqKey: !!process.env.GROQ_API_KEY
      });
      
      llmService = getLLMService();
      embeddingService = getEmbeddingService();
      console.log('✅ LLM services initialized successfully');
    } catch (configError) {
      console.error('❌ LLM service configuration error:', configError);
      const errorMsg = configError instanceof Error ? configError.message : String(configError);
      return NextResponse.json({ 
        reply: `The AI support system is not properly configured: ${errorMsg}. Please set the required API keys (GEMINI_API_KEY, OPENAI_API_KEY, or GROQ_API_KEY) in your environment variables.`, 
        escalated: false, 
        intent: 'general', 
        confidence: 0.0,
        error: 'LLM_NOT_CONFIGURED'
      });
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chunks: any[] = [];
    let top = 0;
    
    try {
      // 1. Generate embedding for the query
      console.log('📝 Generating embedding for query:', message.substring(0, 50));
      const embedding = await embeddingService.getEmbedding(message);
      console.log('✅ Embedding generated, dimensions:', embedding.length);
      
      // 2. Search vector store using RPC function
      const { data: searchResults, error: searchError } = await admin.rpc('kb_search', {
        q_embedding: embedding,
        k: 5
      });
      
      if (searchError) {
        console.error('❌ Vector search error:', searchError);
        throw searchError;
      }
      
      if (searchResults && searchResults.length > 0) {
        chunks = searchResults;
        top = chunks[0]?.score ?? 0;
        console.log('✅ KB search results:', { 
          chunks: chunks.length, 
          topScore: top, 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          scores: chunks.map((c: any) => c.score),
          firstChunkTitle: chunks[0]?.title 
        });
      } else {
        console.warn('⚠️ No KB search results found');
      }
    } catch (e) {
      console.error('❌ KB search failed:', e);
      // If KB search fails, escalate the ticket
      chunks = [];
      top = 0;
    }

    const lastScores = (history as Array<{ confidence?: number }>).map(h => h.confidence).filter((x): x is number => typeof x === 'number');
    const recent = [...lastScores.slice(-1), top];
    const lowStreak = recent.filter(s => s < cfg.OK).length >= cfg.MAX_LOW_STREAK;
    const restricted = RESTRICTED.test(message);

    // Apply similarity threshold guardrail (lowered to 0.3 for better recall since KB might not have all content)
    const SIMILARITY_THRESHOLD = parseFloat(process.env.SUPPORT_KB_SIMILARITY_THRESHOLD || '0.3');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Determine if we should escalate or use LLM general knowledge
    // Escalate only for: restricted content, very low confidence with low streak, or no chunks for non-onboarding queries
    const shouldEscalate = restricted || (top < cfg.LOW && lowStreak && !isOnboardingQuery && validChunks.length === 0);
    
    // For onboarding queries with low similarity, provide helpful onboarding response
    if (isOnboardingQuery && validChunks.length === 0) {
      return NextResponse.json({
        reply: `Welcome to Bookiji! Here's how to get started:

1. **Create an Account**: Click "Book an Appointment" (for customers) or "Offer Your Services" (for providers) in the top navigation, or visit the [Register page](/register)

2. **Complete Your Profile**: Add your preferences and contact information

3. **Start Booking**: Search for services in your area, use our AI chat to describe what you need, and book instantly with real-time availability

For detailed guides, visit the [Get Started page](/get-started) or check out the [Help Center](/help).

Need help with something specific? Feel free to ask!`,
        intent: 'faq',
        confidence: 0.9,
        source: 'onboarding',
        sources: [
          { title: 'Getting Started', url: '/get-started', score: 0.9 },
          { title: 'Help Center', url: '/help', score: 0.8 }
        ]
      });
    }
    
    // For general questions (not Bookiji-related), use LLM general knowledge
    if (!shouldEscalate && validChunks.length === 0 && !isOnboardingQuery) {
      // Use LLM with general knowledge for non-Bookiji questions
      const generalPrompt = `You are a helpful AI assistant. Answer the user's question helpfully and accurately. 
      
If the question is about Bookiji (a universal booking platform), mention that you're the Bookiji Support Bot and can help with booking-related questions.
For technical questions (like programming, tools, libraries), provide accurate information.
Do NOT include URLs or paths in your answer text - keep it clean and conversational.
Be concise, helpful, and friendly.`;

      let answer: string;
      try {
        console.log('🤖 Generating LLM answer for general question...');
        answer = await llmService.generateAnswer(generalPrompt, message) || "I'm not sure how to answer that. Could you provide more details?";
        console.log('✅ Generated LLM answer for general question');
      } catch (llmError) {
        console.error('❌ LLM generation failed:', llmError);
        answer = "I'm having trouble processing your question right now. Please try again later.";
      }

      return NextResponse.json({
        reply: answer,
        intent: 'general',
        confidence: 0.5, // Medium confidence for general knowledge
        source: 'llm',
        sources: []
      });
    }

    if (!shouldEscalate && validChunks.length > 0) {
      // Construct context from valid chunks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contextText = validChunks.map((c: any) => c.snippet).join('\n---\n');
      
      // For onboarding queries or low confidence, allow LLM to use its knowledge
      const isLowConfidence = top < cfg.OK; // Below 0.75
      const allowGeneralKnowledge = isOnboardingQuery || isLowConfidence;
      
      // Generate answer using LLM with appropriate guardrails
      const systemPrompt = allowGeneralKnowledge
        ? `You are the Bookiji Support Bot, a helpful AI assistant for a universal booking platform. 
        
Bookiji is a platform that connects customers with service providers for instant bookings. Key features:
- $1 commitment fee system (small fee to guarantee bookings)
- AI-powered matching and booking
- Real-time availability
- Universal marketplace for any service type

${contextText ? `\nRelevant context from documentation:\n${contextText}\n` : ''}

Answer the user's question helpfully. ${contextText ? 'Use the context above when relevant, but you can also use your general knowledge about booking platforms and onboarding to provide a complete, helpful answer.' : 'Use your knowledge to provide a helpful answer.'}

CRITICAL RULES:
- When mentioning pages, use markdown link format: [Page Name](/path) so they become clickable
- Available pages: [Get Started](/get-started), [Help Center](/help), [How It Works](/how-it-works), [Register](/register), [Login](/login), [Admin Dashboard](/admin), [Customer Dashboard](/customer/dashboard), [Vendor Dashboard](/vendor/dashboard), [About](/about), [Contact](/contact), [FAQ](/faq), [Privacy Policy](/privacy), [Terms of Service](/terms)
- Do NOT include bare paths without markdown links (like /get-started alone)
- Use natural language with clickable links (e.g., "visit the [Get Started page](/get-started)")
- Relevant links will also be shown in the Sources section below your answer
- Be friendly, conversational, and encouraging
- Provide step-by-step guidance when appropriate
- Keep answers concise but complete
- For "get started" or onboarding questions, provide clear next steps with clickable links`
        : `You are the Bookiji Support Bot. Answer the user strictly using ONLY the context provided below. 
    
CRITICAL RULES:
- If the answer is NOT in the context, respond EXACTLY: "I don't have enough information to answer that based on the current documentation."
- Do NOT make up information, speculate, or use knowledge outside the provided context.
- When mentioning pages, use markdown link format: [Page Name](/path) so they become clickable
- Available pages: [Get Started](/get-started), [Help Center](/help), [How It Works](/how-it-works), [Register](/register), [Login](/login), [Admin Dashboard](/admin), [Customer Dashboard](/customer/dashboard), [Vendor Dashboard](/vendor/dashboard), [About](/about), [Contact](/contact), [FAQ](/faq), [Privacy Policy](/privacy), [Terms of Service](/terms)
- Do NOT include bare paths without markdown links (like /get-started alone)
- Use natural language with clickable links (e.g., "visit the [Help Center](/help)")
- Relevant links will also be shown in the Sources section below your answer
- Cite specific details from the context when available.
- Keep answers concise and helpful.
- Be friendly and conversational.

Context:
${contextText}
`;

      let answer: string;
      try {
        console.log('🤖 Generating LLM answer with context...');
        answer = await llmService.generateAnswer(systemPrompt, message) || "I don't have enough information to answer that based on the current documentation.";
        console.log('✅ Generated LLM answer:', { 
          answerLength: answer.length, 
          answerPreview: answer.substring(0, 100), 
          confidence: top 
        });
      } catch (llmError) {
        console.error('❌ LLM generation failed:', llmError);
        // Fallback to best chunk if LLM fails
        answer = validChunks[0]?.snippet || "I'm having trouble processing your question right now. Please try again later.";
        console.log('⚠️ Using fallback answer from chunk');
      }

      // Persist lightweight conversation for suggestion engine
      // Only create ticket if user is authenticated (user_id is required)
      if (userId) {
        try {
          // Create ticket for traceability even if not escalated
          // Note: intent is stored in description or can be added via category_id later
          const t = await admin.from('support_tickets').insert({
            user_id: userId,
            title: message.slice(0, 80),
            description: `${message}\n\n[Intent: ${intent}]`, // Store intent in description for now
            priority: 'medium', // Use 'medium' instead of 'normal' to match schema
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
      } else {
        console.log('⚠️ Skipping ticket creation - user not authenticated');
      }

      // Get sources for citation
      const sources = validChunks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => ({
          title: c.title,
          url: c.url || null,
          score: c.score
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((s: any, i: number, arr: any[]) => 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // Only create ticket if user is authenticated (user_id is required)
    let ticket;
    if (userId) {
      const ticketIns = await admin.from('support_tickets').insert({
        user_id: userId,
        title: message.slice(0, 80),
        description: `${message}\n\n[Intent: ${intent}]`, // Store intent in description for now
        priority: restricted ? 'high' : 'medium', // Use 'medium' instead of 'normal' to match schema
        status: 'open'
      }).select().single();
      
      if (ticketIns.error) throw ticketIns.error;
      ticket = ticketIns.data;
    } else {
      // For unauthenticated users, create a minimal ticket object for response
      ticket = { id: 'anonymous-' + Date.now() };
      console.log('⚠️ Skipping ticket creation for escalation - user not authenticated');
    }

    // Persist conversation with the initial user message to enable suggestion generation later
    // Only if ticket was actually created (user authenticated)
    if (userId && ticket.id && !ticket.id.toString().startsWith('anonymous-')) {
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
    }

    if (email) {
      try {
        await sendSupportEmail(process.env.SUPPORT_ESCALATION_EMAIL!,
          `New ticket ${ticket.id}`, `User: ${email}\nIntent: ${intent}\nMessage: ${message}`);
      } catch (e) {
        console.error('Failed to send support email:', e);
      }
    }

    const replyMessage = userId 
      ? `I'm forwarding this to our support team now. Your ticket ID is ${ticket.id}. We'll email you as soon as possible.`
      : `I'm forwarding this to our support team. Please sign in to track your support request, or provide your email for updates.`;
    
    return NextResponse.json({
      reply: replyMessage,
      escalated: true,
      ticketId: ticket.id
    });
  } catch (e) {
    console.error('❌ Support chat error in handleRequest:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    const errorStack = e instanceof Error ? e.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: e?.constructor?.name
    });
    
    // Re-throw to be handled by outer catch
    throw e;
  }
}

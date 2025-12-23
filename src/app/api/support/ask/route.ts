import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { getLLMService, getEmbeddingService } from '@/lib/support/llm-service';

// Fallback answers for common questions when KB doesn't have exact matches
function getFallbackAnswer(question: string): string {
  const lowerQuestion = question.toLowerCase();
  
  // Registration/signup questions
  if (lowerQuestion.includes('register') || lowerQuestion.includes('sign up') || lowerQuestion.includes('signup') || lowerQuestion.includes('create account')) {
    return `To register on Bookiji:

**For Customers:**
1. Click "Book an Appointment" in the top navigation (or visit /register)
2. Fill in your email and password
3. Verify your email address
4. Complete your profile
5. Start booking services!

**For Providers:**
1. Click "Offer Your Services" in the top navigation (or visit /register)
2. Fill in your email and password
3. Verify your email address
4. Complete your business profile
5. Set your availability and start receiving bookings!

You can also visit /get-started for a guided onboarding experience. Need help with a specific step?`;
  }
  
  // Walkthrough/getting started questions
  if (lowerQuestion.includes('walk') || lowerQuestion.includes('how to') || lowerQuestion.includes('get started') || lowerQuestion.includes('getting started')) {
    return `Here's how to get started with Bookiji:

**For Customers:**
1. Register for an account
2. Search for services you need
3. Book appointments with providers
4. Pay the $1 commitment fee to secure your booking
5. Receive confirmation and enjoy your service

**For Providers:**
1. Register as a provider
2. Complete your business profile
3. Set your availability
4. Start receiving booking requests
5. Confirm bookings and provide services

Would you like more details on any specific step?`;
  }
  
  // Booking questions
  if (lowerQuestion.includes('book') || lowerQuestion.includes('booking') || lowerQuestion.includes('appointment')) {
    return `Booking on Bookiji is simple:
1. Search for the service you need
2. Browse available providers
3. Select a time slot
4. Pay the $1 commitment fee
5. Wait for provider confirmation

The $1 fee ensures serious bookings and is separate from the service price. Need help with a specific booking?`;
  }
  
  // Default helpful response
  return `I'm here to help! While I don't have specific documentation about "${question}", I can help you with:
- Registration and account setup
- Booking services
- Provider onboarding
- Payment and fees
- Cancellations and refunds

You can also visit our Help Center at /help for detailed guides, or contact our support team for personalized assistance.`;
}

// Initialize Clients
const config = getSupabaseConfig();
const supabase = createClient(config.url, config.secretKey!);
const llm = getLLMService(); // For generation
const embeddingService = getEmbeddingService(); // For embeddings

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // 1. Embed Question (use embedding service, not generation service)
    const embedding = await embeddingService.getEmbedding(question);

    // 2. Search Vector Store
    const { data: chunks, error: searchError } = await supabase.rpc('kb_search', {
      q_embedding: embedding,
      k: 5
    });

    if (searchError) {
      console.error('Vector search error:', searchError);
      return NextResponse.json({ error: 'Failed to retrieve context' }, { status: 500 });
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        answer: "I don't have enough information to answer that based on the current documentation.",
        sources: []
      });
    }

    // 3. Apply similarity threshold guardrail (lowered from 0.7 to 0.5 for better recall)
    const SIMILARITY_THRESHOLD = parseFloat(process.env.SUPPORT_KB_SIMILARITY_THRESHOLD || '0.5');
    const validChunks = chunks.filter((c: any) => c.score >= SIMILARITY_THRESHOLD);

    // Log search results for debugging
    console.log('KB Search Results:', {
      totalChunks: chunks.length,
      validChunks: validChunks.length,
      topScore: chunks[0]?.score,
      threshold: SIMILARITY_THRESHOLD,
      question: question.substring(0, 50)
    });

    // If no chunks meet threshold, try with lower threshold or provide helpful fallback
    if (validChunks.length === 0) {
      // Try with even lower threshold (0.3) for very basic questions
      const lenientChunks = chunks.filter((c: any) => c.score >= 0.3);
      
      if (lenientChunks.length > 0) {
        // Use lenient chunks but mark as low confidence
        const contextText = lenientChunks.map((c: any) => c.snippet).join('\n---\n');
        const systemPrompt = `You are the Bookiji Support Bot. Answer the user's question using the context below. If the context doesn't fully answer the question, provide a helpful response based on what you know about Bookiji.

Context:
${contextText}`;
        
        const answer = await llm.generateAnswer(systemPrompt, question) || getFallbackAnswer(question);
        
        return NextResponse.json({
          answer,
          sources: lenientChunks.map((c: any) => ({
            title: c.title,
            url: c.url || null,
            score: c.score
          })).filter((s: any, i: number, arr: any[]) => 
            arr.findIndex((x: any) => x.url === s.url) === i
          )
        });
      }
      
      // No chunks found at all - provide helpful fallback
      return NextResponse.json({
        answer: getFallbackAnswer(question),
        sources: []
      });
    }

    // 4. Construct Context (only from valid chunks)
    const contextText = validChunks.map((c: any) => c.snippet).join('\n---\n');
    
    // 5. Generate Answer with strict guardrails
    const systemPrompt = `You are the Bookiji Support Bot. Answer the user strictly using ONLY the context provided below. 
    
CRITICAL RULES:
- If the answer is NOT in the context, respond EXACTLY: "I don't have enough information to answer that based on the current documentation."
- Do NOT make up information, speculate, or use knowledge outside the provided context.
- Cite specific details from the context when available.
- Keep answers concise and helpful.

Context:
${contextText}
`;

    const answer = await llm.generateAnswer(systemPrompt, question) || "I don't have enough information to answer that based on the current documentation.";

    // 6. Return answer with proper citations (URLs from chunks)
    const sources = validChunks
      .map((c: any) => ({
        title: c.title,
        url: c.url || null,
        score: c.score
      }))
      .filter((s: any, i: number, arr: any[]) => 
        arr.findIndex((x: any) => x.url === s.url) === i // Dedupe by URL
      );

    // 7. Track RAG usage (fire and forget - don't block response)
    (async () => {
      try {
        await supabase
          .from('kb_rag_usage')
          .insert({
            question_length: question.length,
            chunks_retrieved: validChunks.length,
            answer_length: answer.length
          });
      } catch (err: unknown) {
        console.error('Failed to track RAG usage:', err);
      }
    })();

    return NextResponse.json({
      answer,
      sources
    });

  } catch (error) {
    console.error('RAG API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


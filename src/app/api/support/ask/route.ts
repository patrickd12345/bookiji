import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { getLLMService, getEmbeddingService } from '@/lib/support/llm-service';

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

    // 3. Apply similarity threshold guardrail
    const SIMILARITY_THRESHOLD = parseFloat(process.env.SUPPORT_KB_SIMILARITY_THRESHOLD || '0.7');
    const validChunks = chunks.filter((c: any) => c.score >= SIMILARITY_THRESHOLD);

    if (validChunks.length === 0) {
      return NextResponse.json({
        answer: "I don't have enough information to answer that based on the available documentation.",
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


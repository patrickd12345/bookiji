import { SupportAnswer, SupportContext } from '../../ai-core/support/types'
import { ChatOpenAI } from '@langchain/openai'
import { OpenAIEmbeddings } from '@langchain/openai'
import { Document } from 'langchain/document'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '../../../src/config/supabase'

async function retrieveDocuments(query: string): Promise<Document[]> {
  const config = getSupabaseConfig()
  if (!config.url || !config.secretKey) {
    throw new Error('Supabase configuration missing')
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for embeddings')
  }

  const supabase = createClient(config.url, config.secretKey)
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-3-small'
  })

  const queryEmbedding = await embeddings.embedQuery(query)

  const { data, error } = await supabase.rpc('kb_search', {
    q_embedding: queryEmbedding,
    k: 5
  })

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return []
  }

  return data.map((item: any) => new Document({
    pageContent: item.snippet || '',
    metadata: {
      source: item.title || 'Unknown',
      url: item.url || undefined,
      title: item.title,
      score: item.score
    }
  }))
}

function extractCitations(text: string): number[] {
  const citationRegex = /\[(\d+)\]/g
  const matches = text.matchAll(citationRegex)
  const citations = new Set<number>()
  for (const match of matches) {
    citations.add(parseInt(match[1], 10))
  }
  return Array.from(citations).sort((a, b) => a - b)
}

function calculateConfidence(citationCount: number): number {
  if (citationCount === 0) return 0.1
  if (citationCount <= 2) return 0.5
  return 0.8
}

export async function runSupportRag(
  question: string,
  ctx: SupportContext
): Promise<SupportAnswer> {
  // 1. Retrieve documents
  const documents = await retrieveDocuments(question)

  if (documents.length === 0) {
    throw new Error('No documents retrieved from vector store')
  }

  // 2. Build context with numbered citations
  const contextBlocks = documents.map((doc, idx) => {
    const num = idx + 1
    const content = doc.pageContent
    const metadata = doc.metadata || {}
    return `[${num}] ${content}\nSource: ${metadata.source || metadata.title || 'Unknown'}`
  }).join('\n\n')

  // 3. Construct prompts
  const systemPrompt = `You are a Bookiji support assistant. Your role is to help users with questions about the Bookiji platform.

CRITICAL RULES:
- Answer ONLY from the provided context below
- If the answer is NOT in the context, respond EXACTLY: "I don't have enough information to answer that based on the current documentation."
- Do NOT invent features, policies, or steps
- Do NOT use knowledge outside the provided context
- Responses must be concise and factual
- You MUST cite sources using [1], [2], etc. format
- Every answer must include at least one citation`

  const userPrompt = `Context from documentation:

${contextBlocks}

Question: ${question}

Answer the question using ONLY the context above. Cite sources using [1], [2], etc. format.`

  // 4. Generate answer with deterministic LLM
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required')
  }

  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0,
    streaming: false
  })

  const response = await llm.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ])

  const answerText = typeof response.content === 'string' 
    ? response.content 
    : String(response.content)

  // 5. Extract and validate citations
  const citationNumbers = extractCitations(answerText)
  if (citationNumbers.length === 0) {
    throw new Error('Answer contains no citations')
  }

  // 6. Map citations to document metadata
  const citations = citationNumbers
    .filter(num => num >= 1 && num <= documents.length)
    .map(num => {
      const doc = documents[num - 1]
      const metadata = doc.metadata || {}
      return {
        source: metadata.source || metadata.title || 'Unknown',
        url: metadata.url || undefined,
        snippet: doc.pageContent.substring(0, 150) + '...',
        score: metadata.score
      }
    })

  // 7. Calculate confidence
  const confidence = calculateConfidence(citations.length)

  // 8. Return SupportAnswer
  return {
    answerText,
    citations,
    confidence,
    fallbackUsed: false,
    traceId: ctx.traceId
  }
}

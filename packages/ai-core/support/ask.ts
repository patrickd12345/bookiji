import { SupportAnswer } from './types'
import { keywordFallback, loadStaticDocs } from './fallback'
// In a real monorepo setup, you'd import from @bookiji/ai-adapters
// For now, relative import is fine if workspaces aren't strict yet.
import { runSupportRag } from '../../ai-adapters/langchain/supportRag'

const FLAGS = {
  LC_SUPPORT_RAG: process.env.ENABLE_LANGCHAIN_RAG === 'true'
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms)
    promise
      .then(val => { clearTimeout(timer); resolve(val) })
      .catch(err => { clearTimeout(timer); reject(err) })
  })
}

export async function answerSupportQuestion(query: string): Promise<SupportAnswer> {
  const start = performance.now()
  const traceId = crypto.randomUUID()
  let answer: SupportAnswer

  // 1. Fast Path: Feature Flag check
  if (!FLAGS.LC_SUPPORT_RAG) {
    console.log(`[SupportAI] ${traceId} - LangChain disabled, using fallback`)
    answer = keywordFallback(query, loadStaticDocs(), traceId)
  } else {
    // 2. Circuit Breaker / Timeout Guard
    try {
      console.log(`[SupportAI] ${traceId} - Attempting RAG`)
      answer = await withTimeout(
        runSupportRag(query, { traceId }),
        3000 // Hard 3s limit
      )
    } catch (error) {
      console.warn(`[SupportAI] ${traceId} - RAG failed or timed out:`, error)
      // 3. Resilience: Graceful degradation
      answer = keywordFallback(query, loadStaticDocs(), traceId)
    }
  }

  const latencyMs = Math.round(performance.now() - start)
  console.info("support.answer", JSON.stringify({
    traceId: answer.traceId,
    question: query,
    adapterUsed: answer.fallbackUsed ? "fallback" : "langchain",
    fallbackUsed: answer.fallbackUsed,
    latencyMs,
    citationsCount: answer.citations.length,
    confidence: answer.confidence
  }))

  return answer
}


export type SupportAnswer = {
  answerText: string
  citations: Array<{
    source: string
    url?: string
    snippet?: string
    score?: number
  }>
  confidence: number // 0..1 (heuristic)
  fallbackUsed: boolean
  traceId: string
}

export type SupportContext = {
  traceId: string
  userId?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}



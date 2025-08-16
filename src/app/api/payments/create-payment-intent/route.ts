import { NextRequest } from 'next/server'
import { limitRequest } from '@/middleware/requestLimiter'
import { createPaymentsCreateIntentHandler } from '@/lib/paymentsCreateIntentHandler'

const handler = createPaymentsCreateIntentHandler()

export async function POST(request: NextRequest) {
  const limited = limitRequest(request, { windowMs: 60_000, max: 10 })
  if (limited) return limited
  return handler.handle(request)
} 
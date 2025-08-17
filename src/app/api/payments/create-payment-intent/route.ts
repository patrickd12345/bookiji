import { NextRequest } from 'next/server'
import { limitRequest } from '@/middleware/requestLimiter'
import { createPaymentsCreateIntentHandler } from '@/lib/paymentsCreateIntentHandler'

const handler = createPaymentsCreateIntentHandler()

export async function POST(request: NextRequest) {
  const max = parseInt(process.env.RATE_LIMIT_PI_MAX || '10', 10)
  const windowMs = parseInt(process.env.RATE_LIMIT_PI_WINDOW_MS || '60000', 10)
  const limited = await limitRequest(request, { windowMs, max })
  if (limited) return limited
  return handler.handle(request)
} 
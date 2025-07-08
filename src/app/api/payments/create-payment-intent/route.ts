import { NextRequest } from 'next/server'
import { createPaymentsCreateIntentHandler } from '@/lib/paymentsCreateIntentHandler'

const handler = createPaymentsCreateIntentHandler()

export async function POST(request: NextRequest) {
  return handler.handle(request)
} 
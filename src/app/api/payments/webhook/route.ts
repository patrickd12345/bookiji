import { NextRequest } from 'next/server'
import { createPaymentsWebhookHandler } from '@/lib/paymentsWebhookHandler'

const handler = createPaymentsWebhookHandler()

export async function POST(request: NextRequest) {
  return handler.handle(request)
} 
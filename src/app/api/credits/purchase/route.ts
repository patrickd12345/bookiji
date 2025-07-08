import { NextRequest } from 'next/server'
import { createCreditsPurchaseHandler } from '@/lib/creditsPurchaseHandler'

const handler = createCreditsPurchaseHandler()

export async function POST(request: NextRequest) {
  return handler.handle(request)
} 
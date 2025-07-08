import { NextRequest } from 'next/server'
import { createCreditsBalanceHandler } from '@/lib/creditsBalanceHandler'

const handler = createCreditsBalanceHandler()

export async function GET(request: NextRequest) {
  return handler.handle(request)
} 
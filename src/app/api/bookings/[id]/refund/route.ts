import { NextRequest } from 'next/server'
import { processRefund } from '@/lib/services/refundService'

export async function POST(request: NextRequest, context: any) {
  const { params } = context as { params: { id: string } }
  const body = await request.json().catch(() => ({}))
  const result = await processRefund(params.id, body)
  const status = result.status === 'failed' ? 400 : 200
  return Response.json(result, { status })
}

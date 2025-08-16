import { NextRequest } from 'next/server'
import { processRefund } from '@/lib/services/refundService'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const body = await request.json().catch(() => ({}))
  const result = await processRefund(id, body)
  const status = result.status === 'failed' ? 400 : 200
  return Response.json(result, { status })
}

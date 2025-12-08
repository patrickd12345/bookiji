import { NextRequest, NextResponse } from 'next/server'
import { samplePayload, WebhookEvent } from '../_registry'

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const url = body?.url
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const type: WebhookEvent =
    body?.type && typeof body.type === 'string' ? (body.type as WebhookEvent) : 'ops.test'
  const payload = body?.payload || samplePayload(type)

  let delivered = false
  let status: number | undefined
  let error: string | undefined

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    status = res.status
    delivered = res.ok
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to deliver webhook'
  }

  return NextResponse.json({
    success: true,
    delivered,
    status,
    error,
    payload
  })
}

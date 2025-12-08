import { NextRequest, NextResponse } from 'next/server'
import { registerWebhook, WebhookEvent } from '../_registry'

const DEFAULT_EVENTS: WebhookEvent[] = [
  'health.degraded',
  'bookings.anomaly',
  'deployments.new'
]

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const url = body?.url
  const events = (Array.isArray(body?.events) ? body.events : DEFAULT_EVENTS).filter(
    (e: string): e is WebhookEvent => DEFAULT_EVENTS.includes(e as WebhookEvent) || e === 'ops.test'
  )

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  let parsed: URL | null = null
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Disallow localhost registrations from production, but allow in dev
  if (
    process.env.NODE_ENV === 'production' &&
    ['localhost', '127.0.0.1'].includes(parsed.hostname)
  ) {
    return NextResponse.json({ error: 'Localhost webhooks are not allowed in production' }, { status: 400 })
  }

  const registration = registerWebhook(url, events.length ? events : DEFAULT_EVENTS)

  return NextResponse.json({
    success: true,
    registration,
    message: 'Webhook registered for OpsAI events'
  })
}

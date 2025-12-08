import { NextRequest, NextResponse } from 'next/server'
import { evaluatePlaybooks } from '../../_lib/playbooks'

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const health =
    typeof body?.health === 'string' ? body.health : body?.health?.overall || 'unknown'

  const playbooks = evaluatePlaybooks({
    health,
    metrics: body?.metrics,
    incidents: body?.incidents || []
  })

  return NextResponse.json({ playbooks })
}

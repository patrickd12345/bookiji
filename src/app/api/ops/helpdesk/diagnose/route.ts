import { NextRequest, NextResponse } from 'next/server'
import { diagnose } from '../../../../../../packages/opsai-helpdesk/src/engine'

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const log = body?.log || ''
  const summary = body?.summary || {}
  const metrics = body?.metrics || {}

  const result = diagnose(log, { summary, metrics })
  return NextResponse.json({ success: true, result })
}

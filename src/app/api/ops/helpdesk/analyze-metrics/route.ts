import { NextRequest, NextResponse } from 'next/server'
import { analyzeMetrics } from '../../../../../../packages/opsai-helpdesk/src/engine'

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = analyzeMetrics(body?.metrics || body || {})
  return NextResponse.json({ success: true, result })
}

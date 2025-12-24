import { NextRequest, NextResponse } from 'next/server'
import { recommendActions } from '../../../../../../packages/opsai-helpdesk/src/engine'

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // optional body
  }

  const actions = recommendActions({ summary: body.summary, metrics: body.metrics })

  return NextResponse.json({
    success: true,
    actions
  })
}

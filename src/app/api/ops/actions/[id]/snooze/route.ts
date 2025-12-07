import { NextRequest, NextResponse } from 'next/server'
import { updateActionStatus } from '@/scripts/ops-actions-store'

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const snoozeUntil: string | null = body.snoozeUntil ?? null

  const updated = updateActionStatus(id, 'snoozed', {
    decidedBy: 'patrick',
    snoozeUntil
  })

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

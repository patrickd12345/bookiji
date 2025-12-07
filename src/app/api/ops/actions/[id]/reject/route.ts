import { NextRequest, NextResponse } from 'next/server'
import { updateActionStatus } from '@/scripts/ops-actions-store'

export async function POST(
  _req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const { id } = await context.params
  const updated = updateActionStatus(id, 'rejected', {
    decidedBy: 'patrick'
  })

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

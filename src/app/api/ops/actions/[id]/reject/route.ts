import { NextRequest, NextResponse } from 'next/server'
import { updateActionStatus } from '@/scripts/ops-actions-store'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const updated = updateActionStatus(params.id, 'rejected', {
    decidedBy: 'patrick'
  })

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

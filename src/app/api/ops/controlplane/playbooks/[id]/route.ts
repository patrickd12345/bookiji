import { NextRequest, NextResponse } from 'next/server'
import { getPlaybook } from '../../_lib/playbooks'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const playbook = getPlaybook(params.id)
  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }
  return NextResponse.json(playbook)
}

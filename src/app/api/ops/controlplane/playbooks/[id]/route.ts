import { NextRequest, NextResponse } from 'next/server'
import { getPlaybook } from '../../_lib/playbooks'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const playbook = getPlaybook(id)
  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }
  return NextResponse.json(playbook)
}

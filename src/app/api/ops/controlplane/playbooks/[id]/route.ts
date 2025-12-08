import { NextRequest, NextResponse } from 'next/server'
import { getPlaybook } from '../../_lib/playbooks'

type RouteContext = {
  params: {
    id: string
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const playbook = getPlaybook(context.params.id)
  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }
  return NextResponse.json(playbook)
}

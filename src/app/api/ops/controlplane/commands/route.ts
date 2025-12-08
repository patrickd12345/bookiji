import { NextRequest, NextResponse } from 'next/server'
import { runControlCommand } from '../_lib/commands'
import type { CommandRequest } from '../_lib/types'

export async function POST(request: NextRequest) {
  let body: CommandRequest | undefined
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!body?.command) {
    return NextResponse.json(
      { error: 'command is required', accepted: false },
      { status: 400 }
    )
  }

  const response = await runControlCommand(body)
  return NextResponse.json(response)
}

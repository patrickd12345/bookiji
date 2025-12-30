import { NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '../../_utils/auth'

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}


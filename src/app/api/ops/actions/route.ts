import { NextResponse } from 'next/server'
import { loadActions } from '@/scripts/ops-actions-store'

export async function GET() {
  const actions = loadActions()
  return NextResponse.json(actions)
}

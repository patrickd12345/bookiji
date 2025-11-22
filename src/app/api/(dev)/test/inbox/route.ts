import { NextResponse } from 'next/server'
import { getProviderLogs, clearProviderLogs } from '@/lib/services/notificationQueue'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }
  return NextResponse.json({ logs: getProviderLogs() })
}

export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }
  clearProviderLogs()
  return NextResponse.json({ ok: true })
}



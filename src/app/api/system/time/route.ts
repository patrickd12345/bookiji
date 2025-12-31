import { NextResponse } from 'next/server'

export async function GET() {
  const serverNow = Date.now()
  return NextResponse.json({
    server_now: serverNow,
    server_now_iso: new Date(serverNow).toISOString(),
    message: 'Server sourced UTC timestamp'
  })
}

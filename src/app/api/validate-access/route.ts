import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json()
    const secretKey = process.env.BOOKIJI_SECRET_KEY || 'bookiji-2024-secret-key'

    if (key === secretKey) {
      const cookieStore = await cookies()
import { getCookieOptions } from '@/lib/cookieHelpers'

      cookieStore.set('bookiji_access', 'true', getCookieOptions({
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: false
      }))
      return NextResponse.json({ valid: true })
    }

    return NextResponse.json({ valid: false }, { status: 401 })
  } catch (_error) {
    return NextResponse.json({ valid: false, error: 'Invalid request' }, { status: 400 })
  }
}


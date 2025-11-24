import { NextResponse } from 'next/server'

/**
 * Returns the VAPID public key for Web Push subscriptions
 * The private key should be stored securely in environment variables
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  if (!publicKey) {
    return NextResponse.json(
      { error: 'VAPID public key not configured' },
      { status: 500 }
    )
  }

  return NextResponse.json({ publicKey })
}


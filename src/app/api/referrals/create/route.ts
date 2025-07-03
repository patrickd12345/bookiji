import { NextRequest, NextResponse } from 'next/server'
import { referralService } from '@/lib/referrals'

export async function POST(request: NextRequest) {
  try {
    const { referrer_id, referee_email } = await request.json()

    if (!referrer_id || !referee_email) {
      return NextResponse.json({
        error: 'referrer_id and referee_email are required'
      }, { status: 400 })
    }

    await referralService.createReferral(referrer_id, referee_email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Referral creation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create referral' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getUserCredits } from '@/lib/database'

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 100000,
  gold: 500000,
  platinum: 1000000,
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required', success: false }, { status: 400 })
  }

  const result = await getUserCredits(userId)
  if (!result.success || !result.credits) {
    return NextResponse.json({ error: result.error || 'Failed to fetch credits', success: false }, { status: 500 })
  }

  const { lifetime_earned_cents = 0, tier = 'bronze' } = result.credits
  const tiers = Object.keys(TIER_THRESHOLDS) as Array<keyof typeof TIER_THRESHOLDS>
  const currentIndex = tiers.indexOf(tier)
  const nextTier = tiers[Math.min(currentIndex + 1, tiers.length - 1)]
  const currentThreshold = TIER_THRESHOLDS[tier]
  const nextThreshold = TIER_THRESHOLDS[nextTier]
  const progress = Math.min(
    (lifetime_earned_cents - currentThreshold) / (nextThreshold - currentThreshold),
    1,
  )

  return NextResponse.json({
    success: true,
    credits: result.credits,
    progressToNextTier: progress,
    nextTier,
    nextThreshold,
  })
}

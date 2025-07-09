import { NextRequest, NextResponse } from 'next/server'
import { UserCredits } from '../types/global.d'

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 100000,
  gold: 500000,
  platinum: 1000000,
}

export function makeCreditsStatusHandler(creditsGetter: (userId: string) => Promise<{ success: boolean; credits?: UserCredits; error?: string }>) {
  return async function GET(request: NextRequest): Promise<Response> {
    const { searchParams } = new URL(request.url)
    const userId: string | null = searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required', success: false }, { status: 400 })
    }

    const result: { success: boolean; credits?: UserCredits; error?: string } = await creditsGetter(userId)
    console.log('API ROUTE getUserCredits result:', result)
    if (!result || typeof result.success !== 'boolean') {
      return NextResponse.json({ error: 'Failed to fetch credits (no result)', success: false }, { status: 500 })
    }
    if (!result.success || !result.credits) {
      return NextResponse.json({ error: result.error || 'Failed to fetch credits', success: false }, { status: 500 })
    }

    const { lifetime_earned_cents = 0, tier = 'bronze' } = result.credits
    const tiers: Array<keyof typeof TIER_THRESHOLDS> = Object.keys(TIER_THRESHOLDS) as Array<keyof typeof TIER_THRESHOLDS>
    const tierKey = tier as keyof typeof TIER_THRESHOLDS
    const currentIndex = tiers.indexOf(tierKey)
    const nextTier = tiers[Math.min(currentIndex + 1, tiers.length - 1)]
    const currentThreshold = TIER_THRESHOLDS[tierKey]
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
} 
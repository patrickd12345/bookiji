import { getUserCredits } from '@/lib/database'
import { makeCreditsStatusHandler } from '@/lib/creditsStatusHandler'

// Default export for production use
export const GET = makeCreditsStatusHandler(getUserCredits)

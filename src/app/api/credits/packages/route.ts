import { NextResponse } from 'next/server'

const DEFAULT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack', 
    credits_cents: 500,
    price_cents: 500,
    bonus_credits_cents: 0,
    description: 'Perfect for trying out our services',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    credits_cents: 1000,
    price_cents: 900,
    bonus_credits_cents: 200,
    description: 'Most popular - 10% off + 20% bonus credits!',
    is_active: true,
    created_at: new Date().toISOString(),
  }
]

export async function GET() {
  try {
    console.log('Fetching credit packages')
    
    return NextResponse.json({
      success: true,
      packages: DEFAULT_PACKAGES,
      usingDefaults: true,
      message: 'Demo credit packages'
    })

  } catch (_error) {
    return NextResponse.json({
      success: true,
      packages: DEFAULT_PACKAGES,
      usingDefaults: true,
      error: 'Using demo packages'
    })
  }
}

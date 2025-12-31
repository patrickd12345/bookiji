import { NextResponse } from 'next/server'
import { userService, OnboardingData } from '../../../../lib/database'

export async function POST(request: Request) {
  try {
    const onboardingData: OnboardingData = await request.json()

    // Validate input
    if (!onboardingData.full_name || !onboardingData.phone || !onboardingData.location) {
      return NextResponse.json({ 
        error: 'Full name, phone, and location are required' 
      }, { status: 400 })
    }

    // Save onboarding data to user profile
    const success = await userService.saveOnboardingData(onboardingData)

    if (!success) {
      return NextResponse.json({ 
        error: 'Failed to save onboarding data' 
      }, { status: 500 })
    }

    console.warn('✅ Onboarding data saved successfully')

    return NextResponse.json({
      success: true,
      message: 'Onboarding data saved successfully!'
    })

  } catch (error) {
    console.error('Onboarding save error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to save onboarding data',
      success: false
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get current user's onboarding data
    const currentUser = await userService.getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ 
        error: 'User not authenticated' 
      }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        full_name: currentUser.full_name,
        phone: currentUser.phone,
        preferences: currentUser.preferences
      }
    })

  } catch (error) {
    console.error('Onboarding fetch error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch onboarding data',
      success: false
    }, { status: 500 })
  }
} 
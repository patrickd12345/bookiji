import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { userService } from '@/lib/database'
import { referralService } from '@/lib/referrals'

export async function POST(request: Request) {
  try {
    const { email, password, full_name, role = 'customer' } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 })
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role
        }
      }
    })

    if (authError) {
      console.error('Auth registration error:', authError)
      return NextResponse.json({ 
        error: authError.message 
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ 
        error: 'Failed to create user' 
      }, { status: 500 })
    }

    // Create profile in database
    const profile = await userService.upsertProfile({
      id: authData.user.id,
      full_name,
      email,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (!profile) {
      console.error('Failed to create user profile')
      // Note: User was created in auth but profile failed
      // You might want to handle this cleanup
    }

    // Credit referrer if there is a pending referral for this email
    await referralService.completeReferral(email, authData.user.id, role)

    console.log('✅ User registered successfully:', authData.user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role
      },
      message: 'Registration successful! Please check your email to verify your account.'
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Registration failed',
      success: false
    }, { status: 500 })
  }
} 
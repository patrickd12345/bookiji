import { NextResponse } from 'next/server'
import { limitRequest } from '@/middleware/requestLimiter'
import { getServerSupabase } from '@/lib/supabaseClient'

const supabase = getServerSupabase()
import { userService } from '@/lib/database'
import { referralService } from '@/lib/referrals'

export async function POST(request: Request) {
  try {
    const limited = await limitRequest(request, { windowMs: 60_000, max: 5 })
    if (limited) return limited
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
    // Don't use userService.upsertProfile since we don't have auth context yet
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name,
        email,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError) {
      console.error('Failed to create user profile:', profileError)
      // Note: User was created in auth but profile failed
      // You might want to handle this cleanup
    }

    // Credit referrer if there is a pending referral for this email
    await referralService.completeReferral(email, authData.user.id, role)

    try {
      const token = authData.session?.access_token || ''
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          recipient: email,
          template: 'verify_email',
          data: { name: full_name, token }
        })
      })
    } catch {}

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
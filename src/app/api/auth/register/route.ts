import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { limitRequest } from '@/middleware/requestLimiter'
import { getSupabaseServiceKey, getSupabaseUrl } from '@/lib/env/supabaseEnv'
import { referralService } from '@/lib/referrals'

export async function POST(request: Request) {
  try {
    const limited = await limitRequest(request, { windowMs: 60_000, max: 5 })
    if (limited) return limited

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      )
    }

    const { email, password, full_name, role = 'customer' } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Get Supabase configuration
    let supabaseUrl: string
    let serviceKey: string
    try {
      supabaseUrl = getSupabaseUrl()
      serviceKey = getSupabaseServiceKey()
      
      // Validate that we have the required configuration
      if (!supabaseUrl || !serviceKey) {
        console.error('Missing Supabase configuration', { hasUrl: !!supabaseUrl, hasKey: !!serviceKey })
        return NextResponse.json(
          { error: 'Server configuration error. Please contact support.' },
          { status: 500 }
        )
      }
    } catch (configError) {
      console.error('Supabase configuration error:', configError)
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    // Use Admin API to create user directly with email confirmed (skip email verification)
    // Trim the service key in case there's whitespace
    const trimmedServiceKey = serviceKey.trim()
    
    const supabaseAdmin = createClient(supabaseUrl, trimmedServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: { full_name: full_name || '', role },
    })

    if (error) {
      console.error('Supabase user creation error:', {
        message: error.message,
        status: error.status,
        url: supabaseUrl,
        keyPreview: trimmedServiceKey.substring(0, 20) + '...',
        keyFormat: trimmedServiceKey.startsWith('eyJ') ? 'JWT' : trimmedServiceKey.startsWith('sb_') ? 'sb_format' : 'unknown',
      })
      // Provide more helpful error messages
      let errorMessage = error.message
      if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('User already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.'
      } else if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
        errorMessage = 'Server configuration error. Please contact support.'
        console.error('Service key validation failed - check SUPABASE_SECRET_KEY in environment')
      } else if (error.message.includes('invalid') || error.message.includes('Invalid')) {
        errorMessage = 'Invalid email or password format.'
      }
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    if (!data.user) {
      console.error('User creation returned no user data')
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create or update profile row (idempotent).
    // This keeps registration consistent across environments that rely on profiles.
    try {
      const { error: profileUpsertError } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: data.user.id,
            email: data.user.email ?? email.trim().toLowerCase(),
            full_name: full_name || '',
            role,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

      if (profileUpsertError) throw profileUpsertError
    } catch (profileError) {
      console.error('Profile upsert failed during registration:', profileError)
      // Do not fail registration; user is created in auth already.
    }

    // Apply referral crediting (no-op if no matching referral exists).
    try {
      await referralService.completeReferral(email.trim().toLowerCase(), data.user.id, role)
    } catch (referralError) {
      console.error('Referral completion failed during registration:', referralError)
      // Do not fail registration; treat referral as best-effort.
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now sign in.',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed', success: false },
      { status: 500 }
    )
  }
}

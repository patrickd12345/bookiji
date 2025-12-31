import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { limitRequest } from '@/middleware/requestLimiter'
import { getSupabaseServiceKey, getSupabaseUrl } from '@/lib/env/supabaseEnv'

export async function POST(request: Request) {
  try {
    const limited = await limitRequest(request, { windowMs: 60_000, max: 5 })
    if (limited) return limited

    const { email, password, full_name, role = 'customer' } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Use Admin API to create user directly with email confirmed (skip email verification)
    const supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: { full_name, role },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
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

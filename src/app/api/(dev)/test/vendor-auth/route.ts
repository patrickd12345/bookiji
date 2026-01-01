import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceKey } from '@/lib/env/supabaseEnv'

/**
 * GET /api/(dev)/test/vendor-auth
 * 
 * Development-only endpoint for load testing authentication.
 * Returns a Bearer token for the test vendor user.
 * Creates the vendor user if it doesn't exist (idempotent).
 * 
 * This endpoint is for k6 load testing only and should not be used in production.
 */
export async function GET(_request: NextRequest) {
  try {
    // Only allow in development/test environments
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()
    const supabaseServiceKey = getSupabaseServiceKey()

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuration missing' }, { status: 500 })
    }

    // Vendor credentials from stress test seeding
    const vendorEmail = process.env.VENDOR_EMAIL || 'vendor@test.bookiji.com'
    const vendorPassword = process.env.VENDOR_PASSWORD || 'test-vendor-password-123'

    // Create admin client to ensure user exists
    let vendorAuthId: string | null = null
    if (supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      
      // Try to create or get the vendor user
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: vendorEmail,
        password: vendorPassword,
        email_confirm: true,
        user_metadata: { role: 'vendor' }
      })

      if (createData?.user) {
        vendorAuthId = createData.user.id
      } else {
        // User might already exist, try to find it
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const existing = users?.find((u: { email?: string }) => u.email === vendorEmail)
        if (existing) {
          vendorAuthId = existing.id
        } else if (createError && !createError.message.includes('already registered')) {
          console.warn('[VENDOR-AUTH] Could not create or find user, will try sign-in anyway')
        }
      }

      // Ensure profile exists with vendor role
      if (vendorAuthId) {
        await supabaseAdmin
          .from('profiles')
          .upsert({
            auth_user_id: vendorAuthId,
            email: vendorEmail,
            full_name: 'Test Vendor',
            role: 'vendor'
          }, {
            onConflict: 'auth_user_id'
          })
      }
    }

    // Create anon client to sign in and get session (same pattern as simcity-auth)
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

    // Sign in to get session token
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: vendorEmail,
      password: vendorPassword
    })

    if (signInError || !signInData?.session?.access_token) {
      console.error('[VENDOR-AUTH] Sign-in failed', signInError)
      return NextResponse.json(
        { error: 'Failed to obtain session token', details: signInError?.message },
        { status: 500 }
      )
    }

    // Return token (short-lived, expires with session)
    return NextResponse.json({
      success: true,
      token: signInData.session.access_token,
      userId: signInData.user.id,
      email: signInData.user.email,
      expiresAt: signInData.session.expires_at,
      expiresIn: signInData.session.expires_in,
      message: 'DEV ONLY — Vendor authentication token for load testing'
    })
  } catch (error) {
    console.error('[VENDOR-AUTH] Error', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

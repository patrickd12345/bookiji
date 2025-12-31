/**
 * STAGING ONLY — SIMCITY CHAOS AUTHENTICATION
 * 
 * Provides programmatic authentication for SimCity chaos testing in STAGING.
 * 
 * HARD GATES (NON-NEGOTIABLE):
 * - NODE_ENV MUST NOT be 'production'
 * - ENABLE_STAGING_INCIDENTS MUST be 'true'
 * - APP_ENV MUST be 'staging' (or undefined for local)
 * 
 * This endpoint:
 * - Creates/ensures simcity-staging@bookiji.test user
 * - Returns a real Supabase JWT session token
 * - Logs all usage for audit
 * - Fails closed if gates are not met
 * 
 * REVERSIBLE: Delete this file to disable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAppEnv, isProduction } from '@/lib/env/assertAppEnv'
import { getSupabaseAnonKey, getSupabaseServiceKey, getSupabaseUrl } from '@/lib/env/supabaseEnv'

/**
 * Check if SimCity auth is enabled
 */
function isSimCityAuthEnabled(): boolean {
  const nodeEnv = process.env.NODE_ENV
  const enableStagingIncidents = process.env.ENABLE_STAGING_INCIDENTS === 'true'
  const appEnv = getAppEnv()

  // Gate 1: Must NOT be production
  if (nodeEnv === 'production' || isProduction()) {
    return false
  }

  // Gate 2: Must have explicit flag
  if (!enableStagingIncidents) {
    return false
  }

  // Gate 3: APP_ENV must be staging or local (or undefined for backward compat)
  if (appEnv && appEnv !== 'staging' && appEnv !== 'local') {
    return false
  }

  return true
}

/**
 * Create or get SimCity test user
 */
async function ensureSimCityUser(supabaseAdmin: ReturnType<typeof createClient<any, 'public'>>) {
  const email = 'simcity-staging@bookiji.test'
  const password = process.env.SIMCITY_TEST_PASSWORD || `SimCityTest${Date.now()}!`

  try {
    // Try to find existing user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      // User exists - reset password to known value for consistency
      try {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: password
        })
      } catch (_e) {
        // Password update may fail if user was created differently - continue
      }
      return { userId: existingUser.id, email, password }
    }

    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'SimCity Chaos Test User',
        role: 'system-tester',
        is_synthetic: true,
        created_for: 'simcity-chaos-testing'
      }
    })

    if (createError || !newUser?.user) {
      throw new Error(`Failed to create SimCity user: ${createError?.message || 'Unknown error'}`)
    }

    // Ensure profile exists
    try {
      await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: newUser.user.id,
          is_synthetic: true,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
    } catch (e) {
      // Profile creation may fail if RLS blocks - log but continue
      console.warn('[SIMCITY-AUTH] Could not create profile for SimCity user', e)
    }

    return { userId: newUser.user.id, email, password }
  } catch (error) {
    throw new Error(`SimCity user setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * GET /api/(dev)/simcity-auth
 * 
 * Returns a Supabase JWT session token for SimCity chaos testing.
 * 
 * Gated by:
 * - NODE_ENV !== 'production'
 * - ENABLE_STAGING_INCIDENTS === 'true'
 */
export async function GET(request: NextRequest) {
  // AUDIT LOG: Record attempt
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  console.warn('[SIMCITY-AUTH] Access attempt', { 
    ip: clientIp,
    userAgent: request.headers.get('user-agent'),
    nodeEnv: process.env.NODE_ENV,
    appEnv: getAppEnv(),
    enableStagingIncidents: process.env.ENABLE_STAGING_INCIDENTS
  })

  // GATE CHECK: Fail closed if not enabled
  if (!isSimCityAuthEnabled()) {
    console.warn('[SIMCITY-AUTH] Blocked - gates not met', {
      nodeEnv: process.env.NODE_ENV,
      appEnv: getAppEnv(),
      enableStagingIncidents: process.env.ENABLE_STAGING_INCIDENTS
    })
    return NextResponse.json(
      { 
        error: 'SimCity authentication is disabled',
        reason: 'Gates not met: NODE_ENV must not be production, ENABLE_STAGING_INCIDENTS must be true, APP_ENV must be staging or local'
      },
      { status: 403 }
    )
  }

  try {
    const supabaseUrl = getSupabaseUrl()
    const supabaseServiceKey = getSupabaseServiceKey()

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[SIMCITY-AUTH] Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Configuration missing' },
        { status: 500 }
      )
    }

    // Create admin client
    const supabaseAdmin = createClient<any, 'public'>(supabaseUrl, supabaseServiceKey)

    // Ensure SimCity user exists
    const { userId, email, password } = await ensureSimCityUser(supabaseAdmin)

    // Create anon client to sign in and get session
    const supabaseAnon = createClient(supabaseUrl, getSupabaseAnonKey())

    // Sign in to get session token
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    })

    if (signInError || !signInData?.session?.access_token) {
      console.error('[SIMCITY-AUTH] Sign-in failed', signInError)
      return NextResponse.json(
        { error: 'Failed to obtain session token', details: signInError?.message },
        { status: 500 }
      )
    }

    // AUDIT LOG: Success
    console.warn('[SIMCITY-AUTH] Token issued', {
      userId,
      email,
      tokenExpiresAt: signInData.session.expires_at
    })

    // Return token (short-lived, expires with session)
    return NextResponse.json({
      success: true,
      token: signInData.session.access_token,
      userId,
      email,
      expiresAt: signInData.session.expires_at,
      expiresIn: signInData.session.expires_in,
      message: 'STAGING ONLY — SimCity chaos authentication token'
    })
  } catch (error) {
    console.error('[SIMCITY-AUTH] Error', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


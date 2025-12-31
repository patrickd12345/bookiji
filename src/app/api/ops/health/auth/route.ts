import { NextResponse } from 'next/server'

/**
 * Authentication health check endpoint
 * HealthAI monitors this to detect auth service issues, session management problems, and OAuth provider connectivity
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  
  try {
    const { getServerSupabase } = await import('@/lib/supabaseServer')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checks: Record<string, any> = {}
    const recommendations: string[] = []
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    // Test 1: Auth service availability
    const authStart = Date.now()
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    const authLatency = Date.now() - authStart

    if (authError) {
      // JWT errors are expected when no session exists - not a failure
      if (authError.message.includes('JWT') || authError.message.includes('session')) {
        checks.authService = { 
          status: 'passed', 
          latency: authLatency,
          message: 'Auth service responding (no active session expected)'
        }
      } else {
        checks.authService = { status: 'failed', error: authError.message, latency: authLatency }
        overallStatus = 'unhealthy'
        recommendations.push('Auth service unavailable - check Supabase Auth configuration')
      }
    } else {
      checks.authService = { 
        status: 'passed', 
        latency: authLatency,
        hasSession: !!session,
        message: 'Auth service operational'
      }
      if (authLatency > 1000) {
        recommendations.push(`Auth service latency elevated: ${authLatency}ms`)
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
      }
    }

    // Test 2: User profile access (RLS check)
    const profileStart = Date.now()
    const { error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .limit(1)
    const profileLatency = Date.now() - profileStart

    if (profileError) {
      // Some errors are expected (e.g., RLS blocking when not authenticated)
      if (profileError.code === 'PGRST116' || profileError.message.includes('permission')) {
        checks.profileAccess = { 
          status: 'passed', 
          latency: profileLatency,
          message: 'Profile access working (RLS policies active)'
        }
      } else {
        checks.profileAccess = { status: 'failed', error: profileError.message, latency: profileLatency }
        overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy'
        recommendations.push('Profile table access issues - check RLS policies')
      }
    } else {
      checks.profileAccess = { 
        status: 'passed', 
        latency: profileLatency,
        message: 'Profile access operational'
      }
      if (profileLatency > 1000) {
        recommendations.push(`Profile access latency elevated: ${profileLatency}ms`)
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
      }
    }

    // Test 3: OAuth providers configuration (check if Google OAuth is configured)
    const oauthConfig = {
      google: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
      // Add other OAuth providers as needed
    }
    
    checks.oauthProviders = {
      status: Object.values(oauthConfig).some(v => v) ? 'passed' : 'warning',
      configured: oauthConfig,
      message: Object.values(oauthConfig).some(v => v) 
        ? 'OAuth providers configured' 
        : 'No OAuth providers configured'
    }

    if (!Object.values(oauthConfig).some(v => v)) {
      recommendations.push('No OAuth providers configured - users limited to email/password')
      // This is not necessarily unhealthy, just informational
    }

    // Test 4: Environment variables check
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      supabaseSecretKey: !!process.env.SUPABASE_SECRET_KEY,
      legacyAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      legacyServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    // Required for normal operation: URL + publishable key. Secret key is only required for admin/server operations.
    const requiredEnvPresent = envCheck.supabaseUrl && envCheck.supabasePublishableKey
    const adminEnvPresent = envCheck.supabaseSecretKey

    const allEnvPresent = requiredEnvPresent && adminEnvPresent
    checks.environment = {
      status: allEnvPresent ? 'passed' : 'failed',
      variables: envCheck,
      message: allEnvPresent 
        ? 'All required environment variables present' 
        : requiredEnvPresent
          ? 'Supabase client env present; admin env missing (server features may fail)'
          : 'Some environment variables missing'
    }

    if (!requiredEnvPresent) {
      overallStatus = 'unhealthy'
      recommendations.push('Missing required Supabase environment variables')
      recommendations.push('Verify NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set')
    } else if (!adminEnvPresent) {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
      recommendations.push('Supabase admin key missing — server-side admin operations may fail')
      recommendations.push('Set SUPABASE_SECRET_KEY for admin operations (or legacy SUPABASE_SERVICE_ROLE_KEY)')
    }

    if (recommendations.length === 0) {
      recommendations.push('Authentication system operating normally')
    }

    return NextResponse.json({
      status: overallStatus,
      timestamp,
      checks,
      metrics: {
        authLatency,
        profileLatency
      },
      recommendations
    }, {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp,
      error: error instanceof Error ? error.message : 'Auth health check failed',
      recommendations: [
        'Auth health check system unavailable',
        'Review application logs for auth-related errors',
        'Verify Supabase configuration and environment variables'
      ]
    }, { status: 503 })
  }
}

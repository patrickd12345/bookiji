import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { rateLimit } from '@/lib/ratelimit'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

interface SystemStatus {
  name: string
  status: 'healthy' | 'operational' | 'connected' | 'warning' | 'error'
  label: string
}

/**
 * GET /api/admin/dashboard/system-status
 * Returns system health status for various services
 */
export async function GET(request: NextRequest) {
  try {
    const config = getSupabaseConfig()
    const cookieStore = await cookies()
    const authHeader = request.headers.get('authorization')
    
    let user: { id: string; email?: string } | null = null
    
    // Try Bearer token first
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const supabase = createSupabaseServerClient()
      const { data: { user: tokenUser }, error: authError } = await supabase.auth.getUser(token)
      if (!authError && tokenUser) {
        user = tokenUser
      }
    }
    
    // Fallback to cookie-based session
    if (!user) {
      const supabaseAuth = createServerClient(
        config.url,
        config.publishableKey,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => {
                  cookieStore.set(name, value, options)
                })
              } catch (_error) {
                // Ignore - setAll called from Route Handler
              }
            }
          }
        }
      )
      const { data: { user: cookieUser }, error: cookieError } = await supabaseAuth.auth.getUser()
      if (cookieError) {
        console.error('Cookie auth error:', cookieError)
      }
      if (cookieUser) {
        user = cookieUser
      }
    }
    
    if (!user) {
      console.error('No user found - authHeader:', !!authHeader, 'cookies:', cookieStore.getAll().length)
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    // Check admin access
    try {
      await requireAdmin({ user } as any)
    } catch (adminError) {
      console.error('Admin check failed:', adminError)
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Rate limiting
    const rateLimitKey = `admin:${user.email || user.id}:dashboard-system-status`
    if (!rateLimit(rateLimitKey, 60, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const supabase = createSupabaseServerClient()
    const statuses: SystemStatus[] = []

    // Check Database
    try {
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
      statuses.push({
        name: 'Database',
        status: !error ? 'healthy' : 'error',
        label: !error ? 'Healthy' : 'Error'
      })
    } catch (err) {
      statuses.push({
        name: 'Database',
        status: 'error',
        label: 'Error'
      })
    }

    // Check API Services (check if we can query services table)
    try {
      const { error } = await supabase
        .from('services')
        .select('id')
        .limit(1)
      statuses.push({
        name: 'API Services',
        status: !error ? 'operational' : 'error',
        label: !error ? 'Operational' : 'Error'
      })
    } catch (err) {
      statuses.push({
        name: 'API Services',
        status: 'error',
        label: 'Error'
      })
    }

    // Check Payment Gateway (check if Stripe is configured)
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_LIVE_KEY
    statuses.push({
      name: 'Payment Gateway',
      status: stripeKey ? 'connected' : 'warning',
      label: stripeKey ? 'Connected' : 'Not Configured'
    })

    // Check AI Services (check if Ollama is configured)
    const ollamaUrl = process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_URL
    statuses.push({
      name: 'AI Services',
      status: ollamaUrl ? 'operational' : 'warning',
      label: ollamaUrl ? 'Operational' : 'Warning'
    })

    return NextResponse.json({
      statuses
    })

  } catch (error) {
    console.error('Admin dashboard system status API error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

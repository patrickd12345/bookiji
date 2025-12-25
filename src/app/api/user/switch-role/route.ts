import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/config/supabase'
import { switchUserRole } from '@/lib/utils/roleSwitching'
import { createErrorResponse, createSuccessResponse, ErrorCodes } from '@/lib/api/errorEnvelope'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const config = getSupabaseConfig()
    const supabase = createServerClient(config.url, config.publishableKey, {
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
            // Ignore cookie setting errors in middleware
          }
        }
      }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(
        ErrorCodes.AUTHENTICATION_ERROR,
        'Not authenticated',
        401,
        undefined,
        req.nextUrl.pathname
      )
    }

    const body = await req.json()
    const { newRole } = body

    if (!newRole || !['customer', 'vendor'].includes(newRole)) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid role. Must be "customer" or "vendor"',
        400,
        { field: 'newRole', value: newRole },
        req.nextUrl.pathname
      )
    }

    // Switch role (preserves session)
    const result = await switchUserRole(user.id, newRole as 'customer' | 'vendor')

    if (!result.success) {
      return createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        result.error || 'Failed to switch role',
        500,
        undefined,
        req.nextUrl.pathname
      )
    }

    return createSuccessResponse({
      role: result.newRole,
      message: 'Role switched successfully',
    })
  } catch (error) {
    console.error('Role switch error:', error)
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      req.nextUrl.pathname
    )
  }
}

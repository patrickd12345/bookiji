import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import type { NextRequest } from 'next/server'

export function getBearer(req: NextRequest): string | null {
  const raw = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!raw) return null;
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  return m ? m[1] : null;
}

/**
 * Returns the authenticated user's id using either the Supabase session cookie
 * or an Authorization header bearer token. Returns null if authentication fails.
 */
export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const cookieStore = await cookies()
  
  const config = getSupabaseConfig()
  
  // Guard against undefined config values
  const key = config.publishableKey || config.anonKey
  if (!config.url || !key) {
    console.error('Missing Supabase configuration')
    return null
  }
  
  const supabase = createServerClient(
    config.url,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  // Try cookie-based session first
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) {
    return session.user.id
  }

  // Fallback to Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user?.id) {
      return user.id
    }
  }

  return null
}

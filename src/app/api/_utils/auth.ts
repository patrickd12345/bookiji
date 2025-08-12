import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/**
 * Returns the authenticated user's id using either the Supabase session cookie
 * or an Authorization header bearer token. Returns null if authentication fails.
 */
export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const cookieStore = await cookies()
  
  // Support both old and new key models during migration
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabasePublishableKey) {
    throw new Error('Missing Supabase publishable key environment variable');
  }
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabasePublishableKey,
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

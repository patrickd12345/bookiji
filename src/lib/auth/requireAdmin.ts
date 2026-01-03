import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import type { PostgrestError } from '@supabase/supabase-js'

export interface AdminUser {
  id: string
  email: string
  role: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requireAdmin(session: any): Promise<AdminUser> {
  if (!session?.user?.id) {
    throw new Error('unauthenticated')
  }

  const supabase = createSupabaseServerClient()
  
  // Get user profile with role
  // Try auth_user_id first (new schema), then id (old schema)
  let profile: { id: string; email: string; role: string } | null = null
  let error: PostgrestError | null = null
  
  const primaryResult = await supabase
    .from('profiles')
    .select('id, email, role, auth_user_id')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()
  
  profile = primaryResult.data
  error = primaryResult.error

  // Fallback to id if auth_user_id doesn't exist (backward compatibility)
  if (error || !profile) {
    const fallbackResult = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', session.user.id)
      .maybeSingle()
    profile = fallbackResult.data
    error = fallbackResult.error
  }

  if (error || !profile) {
    console.error('Profile lookup failed:', { userId: session.user.id, error })
    throw new Error('profile_not_found')
  }

  // Check if user is admin via profiles.role
  if (profile.role === 'admin') {
    return profile
  }

  // Check user_roles table (flexible role management)
  // user_roles.app_user_id references app_users.id, so we need to join through app_users
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()

  if (appUser?.id) {
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('app_user_id', appUser.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (userRole?.role === 'admin') {
      // Return profile with admin role for consistency
      return { ...profile, role: 'admin' }
    }
  }

  // Optional: Check if user is admin via org_id (only if ADMIN_ORG_IDS is configured)
  const ADMIN_ORG_IDS = process.env.ADMIN_ORG_IDS?.split(',').filter(Boolean) || []
  if (ADMIN_ORG_IDS.length > 0) {
    const { data: profileWithOrg } = await supabase
      .from('profiles')
      .select('id, email, role, org_id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()
    
    if (profileWithOrg?.org_id && ADMIN_ORG_IDS.includes(profileWithOrg.org_id)) {
      return { ...profile, role: 'admin' }
    }
  }

  console.error('User is not admin:', { userId: session.user.id, email: profile.email, role: profile.role })
  throw new Error('forbidden')
}

export async function isAdminEmail(email: string): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('email', email)
    .single()

  if (error || !profile) {
    return false
  }

  return profile.role === 'admin'
}
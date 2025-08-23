import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export interface AdminUser {
  id: string
  email: string
  role: string
  organization_id?: string
}

export async function requireAdmin(session: any): Promise<AdminUser> {
  if (!session?.user?.id) {
    throw new Error('unauthenticated')
  }

  const supabase = createSupabaseServerClient()
  
  // Get user profile with role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .eq('id', session.user.id)
    .single()

  if (error || !profile) {
    throw new Error('profile_not_found')
  }

  if (profile.role !== 'admin') {
    throw new Error('forbidden')
  }

  return profile
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
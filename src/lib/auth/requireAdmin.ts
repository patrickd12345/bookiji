import { cookies } from 'next/headers'
import { getSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function requireAdmin(): Promise<{ userId: string }> {
  const cookieStore = cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value
  if (!accessToken) throw new Error('Unauthorized: no session')

  const supabase = getSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized: invalid user')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') throw new Error('Forbidden: admin only')
  return { userId: user.id }
}
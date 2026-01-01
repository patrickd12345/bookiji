import { NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '../../_utils/auth'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // INV-1 (Admin & Ops): Admin-only actions must verify admin role server-side.
  const supabase = createSupabaseServerClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', userId)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin'
  if (profileError || !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}


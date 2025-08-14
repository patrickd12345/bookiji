import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json().catch(() => ({}))
  if (!token || !newPassword) {
    return NextResponse.json({ ok: false, error: 'token and newPassword required' }, { status: 400 })
  }
  
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  }
  
  return NextResponse.json({ ok: true })
}

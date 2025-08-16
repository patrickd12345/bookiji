import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET(request: NextRequest) {
  try {
    const config = getSupabaseConfig()
    const supabase = createClient(config.url, config.publishableKey)

    // Try cookie-based auth first
    const cookieStore = await request.cookies
    const authToken = cookieStore.get('sb-access-token')?.value
    if (!authToken) return NextResponse.json({ isAdmin: false }, { status: 200 })

    const { data: { user } } = await supabase.auth.getUser(authToken)
    if (!user) return NextResponse.json({ isAdmin: false }, { status: 200 })

    const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.id).maybeSingle()
    const isAdmin = profile?.role === 'admin'
    return NextResponse.json({ isAdmin, userId: user.id, email: user.email })
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 200 })
  }
}
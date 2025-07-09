import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}

export async function GET() {
  try {
    const supabase = createSupabaseClient()
    
    // Get the authorization cookie/header
    const cookieStore = await cookies()
    const authToken = cookieStore.get('sb-access-token')?.value
    
    if (!authToken) {
      return NextResponse.json({ isAdmin: false, error: 'No auth token' }, { status: 401 })
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken)
    
    if (userError || !user) {
      return NextResponse.json({ isAdmin: false, error: 'Invalid token' }, { status: 401 })
    }

    // Check if user has admin permissions in database
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (adminError && adminError.code !== 'PGRST116') {
      console.error('Admin check error:', adminError)
      return NextResponse.json({ isAdmin: false, error: 'Database error' }, { status: 500 })
    }

    const isAdmin = !!adminCheck
    
    return NextResponse.json({ 
      isAdmin,
      userId: user.id,
      email: user.email
    })

  } catch (error) {
    console.error('Admin check failed:', error)
    return NextResponse.json({ 
      isAdmin: false, 
      error: 'Authentication check failed' 
    }, { status: 500 })
  }
} 
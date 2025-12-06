import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/config/supabase'

/**
 * Server-side profile creation/repair endpoint
 * 
 * Called by authenticated clients when profile doesn't exist
 * Ensures profile creation happens with proper validation and error handling
 * 
 * POST /api/auth/profile/create
 * Auth: Required (user must be authenticated)
 * Body: { role?: 'customer' | 'vendor' }
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const config = getSupabaseConfig()
    
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      )
    }

    const { role = 'customer' } = await request.json()

    // Validate role
    if (!['customer', 'vendor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role - must be customer or vendor' },
        { status: 400 }
      )
    }

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing profile:', checkError)
      return NextResponse.json(
        { error: 'Failed to check profile status' },
        { status: 500 }
      )
    }

    // If profile exists, return it
    if (existingProfile) {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        return NextResponse.json(
          { error: 'Failed to fetch profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        profile,
        message: 'Profile already exists'
      })
    }

    // Create new profile with validated data
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 'User',
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: newProfile,
      message: 'Profile created successfully'
    })
  } catch (error) {
    console.error('Profile creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


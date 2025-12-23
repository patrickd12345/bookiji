import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

/**
 * Admin endpoint to reset user password
 * POST /api/admin/reset-password
 * Body: { email: string, newPassword: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, newPassword } = await req.json().catch(() => ({}))
    
    if (!email || !newPassword) {
      return NextResponse.json(
        { ok: false, error: 'email and newPassword are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()
    
    // First, find the user by email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      return NextResponse.json(
        { ok: false, error: `Failed to list users: ${listError.message}` },
        { status: 500 }
      )
    }

    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      return NextResponse.json(
        { ok: false, error: `User with email ${email} not found` },
        { status: 404 }
      )
    }

    // Update the user's password using admin API
    // Note: Supabase admin API uses updateUserById with attributes object
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: newPassword,
        email_confirm: true // Ensure email is confirmed
      }
    )

    if (updateError) {
      console.error('Supabase updateUserById error:', updateError)
      return NextResponse.json(
        { ok: false, error: `Failed to update password: ${updateError.message}`, details: updateError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: `Password reset successfully for ${email}`,
      userId: updatedUser.user.id
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '../../../../lib/supabaseServer'

const getSupabase = () => getServerSupabase()

// GET /api/user/roles - Get user's roles
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    // Set auth token for this request
    const token = authHeader.replace('Bearer ', '')
    supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    // Get user roles from the view
    const { data: userRoles, error } = await supabase
      .from('user_role_summary')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user roles:', error)
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      roles: userRoles?.roles || [],
      can_book_services: userRoles?.can_book_services || false,
      can_offer_services: userRoles?.can_offer_services || false,
      is_admin: userRoles?.is_admin || false
    })

  } catch (error) {
    console.error('Error in GET /api/user/roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/user/roles - Add a role to user
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const { role } = await request.json()
    if (!role || !['customer', 'vendor', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 })
    }

    // Set auth token for this request
    const token = authHeader.replace('Bearer ', '')
    supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    // Add role using the database function
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: role,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating user role:', error);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    // Get updated user roles
    const { data: updatedRoles } = await supabase
      .from('user_role_summary')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      message: `Role '${role}' added successfully`,
      roles: updatedRoles?.roles || [],
      can_book_services: updatedRoles?.can_book_services || false,
      can_offer_services: updatedRoles?.can_offer_services || false,
      is_admin: updatedRoles?.is_admin || false
    })

  } catch (error) {
    console.error('Error in POST /api/user/roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/user/roles - Remove a role from user
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const { role } = await request.json()
    if (!role || !['customer', 'vendor', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 })
    }

    // Set auth token for this request
    const token = authHeader.replace('Bearer ', '')
    supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    // Prevent removing the last role (users must have at least one role)
    const { data: currentRoles } = await supabase
      .from('user_role_summary')
      .select('roles')
      .eq('user_id', user.id)
      .single()

    if (currentRoles?.roles?.length <= 1) {
      return NextResponse.json({ 
        error: 'Cannot remove the last role. Users must have at least one role.' 
      }, { status: 400 })
    }

    // Remove role using the database function
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user.id)
      .eq('role', role);

    if (error) {
      console.error('Error removing user role:', error);
      return NextResponse.json(
        { error: 'Failed to remove user role' },
        { status: 500 }
      );
    }

    // Get updated user roles
    const { data: updatedRoles } = await supabase
      .from('user_role_summary')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      message: `Role '${role}' removed successfully`,
      roles: updatedRoles?.roles || [],
      can_book_services: updatedRoles?.can_book_services || false,
      can_offer_services: updatedRoles?.can_offer_services || false,
      is_admin: updatedRoles?.is_admin || false
    })

  } catch (error) {
    console.error('Error in DELETE /api/user/roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
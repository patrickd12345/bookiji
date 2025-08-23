import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { CreditsResponse, AddCreditsRequest } from '@/types/credits';

export async function POST(request: NextRequest): Promise<NextResponse<CreditsResponse>> {
  try {
    const supabase = getSupabaseClient();
    
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse request body
    const body: AddCreditsRequest = await request.json();
    
    // Validate required fields
    if (!body.user_id || !body.amount || !body.transaction_type || !body.description) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Only allow admins to add credits to other users
    if (body.user_id !== user.id) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (userProfile?.role !== 'admin') {
        return NextResponse.json({
          success: false,
          error: 'Insufficient permissions'
        }, { status: 403 });
      }
    }

    // Add credits using the database function
    const { data, error } = await supabase.rpc('add_user_credits', {
      p_user_id: body.user_id,
      p_amount: body.amount,
      p_transaction_type: body.transaction_type,
      p_description: body.description,
      p_reference_type: body.reference_type,
      p_reference_id: body.reference_id,
      p_metadata: body.metadata || {},
      p_created_by: user.id
    });

    if (error) {
      console.error('Error adding credits:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to add credits'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { new_balance: data },
      message: 'Credits added successfully'
    });

  } catch (error) {
    console.error('Unexpected error in add credits API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}




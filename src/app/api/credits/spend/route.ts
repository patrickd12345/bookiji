import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { CreditsResponse, SpendCreditsRequest } from '@/types/credits';

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
    const body: SpendCreditsRequest = await request.json();
    
    // Validate required fields
    if (!body.amount || !body.description) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Validate amount
    if (body.amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be positive'
      }, { status: 400 });
    }

    // Check user has enough credits
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits_summary')
      .select('credits_balance')
      .eq('id', user.id)
      .single();

    if (creditsError || !userCredits) {
      return NextResponse.json({
        success: false,
        error: 'Unable to fetch user credits'
      }, { status: 500 });
    }

    if (userCredits.credits_balance < body.amount) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient credits'
      }, { status: 400 });
    }

    // Spend credits using the database function
    const { data, error } = await supabase.rpc('spend_user_credits', {
      p_user_id: user.id,
      p_amount: body.amount,
      p_description: body.description,
      p_reference_type: body.reference_type,
      p_reference_id: body.reference_id,
      p_metadata: body.metadata || {}
    });

    if (error) {
      console.error('Error spending credits:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to spend credits'
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Failed to process credit redemption'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { credits_spent: body.amount },
      message: 'Credits spent successfully'
    });

  } catch (error) {
    console.error('Unexpected error in spend credits API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}




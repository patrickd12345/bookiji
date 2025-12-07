import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseClient';
import { CreditsResponse, UserCreditsSummary } from '@/types/credits';

export async function GET(
  request: NextRequest
): Promise<NextResponse<CreditsResponse>> {
  try {
    const supabase = getServerSupabase();
    
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get user credits summary
    const { data, error } = await supabase
      .from('user_credits_summary')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user credits:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user credits'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Unexpected error in user credits API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

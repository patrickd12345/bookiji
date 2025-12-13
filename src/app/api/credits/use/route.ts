import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

export async function POST(request: NextRequest) {
  try {
    const { credits, bookingId, serviceType } = await request.json();

    if (!credits || !bookingId || !serviceType) {
      return NextResponse.json(
        { error: 'Missing required fields: credits, bookingId, serviceType' },
        { status: 400 }
      );
    }

    // Validate credits amount
    if (credits <= 0) {
      return NextResponse.json(
        { error: 'Credits amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has enough credits
    const { data: creditBalance } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (!creditBalance || creditBalance.balance < credits) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      );
    }

    // Deduct credits
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ 
        balance: creditBalance.balance - credits,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return NextResponse.json(
        { error: 'Failed to update credits' },
        { status: 500 }
      );
    }

    // Record credit usage
    const { error: usageError } = await supabase
      .from('credit_usage')
      .insert({
        user_id: user.id,
        credits_used: credits,
        booking_id: bookingId,
        service_type: serviceType,
        used_at: new Date().toISOString()
      });

    if (usageError) {
      console.error('Error recording credit usage:', usageError);
      // Note: We don't rollback the credit deduction here as the usage was successful
    }

    return NextResponse.json({
      success: true,
      remainingCredits: creditBalance.balance - credits,
      creditsUsed: credits
    });

  } catch (error) {
    console.error('Error using credits:', error);
    return NextResponse.json(
      { error: 'Failed to use credits' },
      { status: 500 }
    );
  }
} 
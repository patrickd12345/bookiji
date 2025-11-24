import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET() {
  try {
    // Check admin permissions
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    const { data: disputes, error } = await supabase
      .from('disputes')
      .select(`
        *,
        booking:bookings (
          id,
          service_name:service_type,
          total_amount,
          status,
          customer_id,
          provider_id
        ),
        user:users (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching disputes:', error);
      return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      disputes: disputes || [] 
    });

  } catch (error) {
    console.error('Disputes API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

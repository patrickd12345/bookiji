import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin permissions
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { status, resolution, resolution_amount, admin_notes } = body;

    if (!status || !['resolved', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Update dispute
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status,
        resolution,
        resolution_amount,
        admin_notes,
        resolved_at: new Date().toISOString(),
        admin_id: adminCheck.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error resolving dispute:', error);
      return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      dispute: data 
    });

  } catch (error) {
    console.error('Dispute resolution API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

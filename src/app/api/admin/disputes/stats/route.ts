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

    // Fetch basic counts
    const { data: counts, error: countsError } = await supabase
      .from('disputes')
      .select('status');

    if (countsError) {
      throw countsError;
    }

    // Calculate counts
    const stats = {
      total: counts.length,
      pending: counts.filter(d => d.status === 'pending').length,
      under_review: counts.filter(d => d.status === 'under_review').length,
      resolved: counts.filter(d => d.status === 'resolved').length,
      closed: counts.filter(d => d.status === 'closed').length,
      avg_resolution_time: 0
    };

    // Calculate average resolution time for resolved disputes
    const { data: resolvedDisputes, error: resolvedError } = await supabase
      .from('disputes')
      .select('created_at, resolved_at')
      .not('resolved_at', 'is', null);

    if (!resolvedError && resolvedDisputes && resolvedDisputes.length > 0) {
      const totalTime = resolvedDisputes.reduce((acc, curr) => {
        const created = new Date(curr.created_at).getTime();
        const resolved = new Date(curr.resolved_at).getTime();
        return acc + (resolved - created);
      }, 0);

      // Convert ms to hours
      stats.avg_resolution_time = Math.round(totalTime / resolvedDisputes.length / (1000 * 60 * 60));
    }

    return NextResponse.json({ 
      success: true,
      stats 
    });

  } catch (error) {
    console.error('Dispute stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { queryLogger } from '@/lib/performance/queryLogger';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const table = searchParams.get('table');
    const operation = searchParams.get('operation');

    // Get performance summary from database
    let query = supabase
      .from('performance_summary')
      .select('*')
      .gte('hour_bucket', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('hour_bucket', { ascending: false });

    if (table) {
      query = query.eq('table_name', table);
    }
    if (operation) {
      query = query.eq('operation', operation);
    }

    const { data: dbMetrics, error: dbError } = await query;

    if (dbError) {
      console.error('Database error:', dbError);
      // Fallback to in-memory metrics if database fails
      const inMemorySummary = queryLogger.getPerformanceSummary({
        start: new Date(Date.now() - hours * 60 * 60 * 1000),
        end: new Date()
      });
      
      return NextResponse.json({
        success: true,
        data: {
          summary: inMemorySummary,
          source: 'in_memory',
          message: 'Database metrics unavailable, using in-memory data'
        }
      });
    }

    // Get performance alerts
    const { data: alerts, error: alertsError } = await supabase
      .rpc('get_performance_alerts', { p_hours: hours, p_threshold_ms: 1000 });

    if (alertsError) {
      console.error('Alerts error:', alertsError);
    }

    // Get in-memory metrics for comparison
    const inMemorySummary = queryLogger.getPerformanceSummary({
      start: new Date(Date.now() - hours * 60 * 60 * 1000),
      end: new Date()
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: dbMetrics || [],
        alerts: alerts || [],
        inMemorySummary,
        source: 'database',
        timeRange: `${hours} hours`,
        generated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Performance metrics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'clear_metrics':
        queryLogger.clearMetrics();
        return NextResponse.json({ success: true, message: 'In-memory metrics cleared' });

      case 'set_thresholds':
        const { slowQueryThreshold, expensiveQueryThreshold, maxRowsPerQuery } = params;
        queryLogger.setThresholds({
          slowQueryThreshold: slowQueryThreshold || 500,
          expensiveQueryThreshold: expensiveQueryThreshold || 100,
          maxRowsPerQuery: maxRowsPerQuery || 1000
        });
        return NextResponse.json({ success: true, message: 'Thresholds updated' });

      case 'export_metrics':
        const metrics = queryLogger.exportMetrics();
        return NextResponse.json({ 
          success: true, 
          data: metrics,
          filename: `performance-metrics-${new Date().toISOString().split('T')[0]}.json`
        });

      case 'clean_database':
        const { data, error } = await supabase.rpc('clean_old_performance_metrics');
        if (error) {
          return NextResponse.json({ error: 'Failed to clean database' }, { status: 500 });
        }
        return NextResponse.json({ 
          success: true, 
          message: `Cleaned ${data} old performance metrics` 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Performance metrics action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


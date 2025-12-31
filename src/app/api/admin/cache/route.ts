import { NextRequest, NextResponse } from 'next/server';
import { cachePerformanceMonitor } from '@/lib/cache/monitoring';
import { cacheWarmingService } from '@/lib/cache/warming';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// Helper to get admin client safely
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase admin configuration missing (need SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, key)
}

/**
 * AUTHORITATIVE PATH — Admin role verification required
 * See: docs/invariants/admin-ops.md INV-1
 */
export async function GET(request: NextRequest) {
  try {
    // Admin verification
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await requireAdmin(session)
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const timeRange = searchParams.get('timeRange') || '24h';

    switch (action) {
      case 'performance':
        const performanceMetrics = await cachePerformanceMonitor.getCachePerformanceByType(timeRange);
        return NextResponse.json({ success: true, data: performanceMetrics });

      case 'invalidation-patterns':
        const invalidationPatterns = await cachePerformanceMonitor.getInvalidationPatterns(timeRange);
        return NextResponse.json({ success: true, data: invalidationPatterns });

      case 'ttl-optimizations':
        const ttlOptimizations = await cachePerformanceMonitor.getTTLOptimizations();
        return NextResponse.json({ success: true, data: ttlOptimizations });

      case 'health-summary':
        const healthSummary = await cachePerformanceMonitor.getCacheHealthSummary();
        return NextResponse.json({ success: true, data: healthSummary });

      case 'warming-strategies':
        const strategies = cacheWarmingService.getStrategies();
        return NextResponse.json({ success: true, data: strategies });

      case 'warming-metrics':
        const warmingMetrics = cacheWarmingService.getWarmingMetrics();
        return NextResponse.json({ success: true, data: warmingMetrics });

      case 'warming-history':
        const limit = parseInt(searchParams.get('limit') || '50');
        const warmingHistory = cacheWarmingService.getWarmingHistory(limit);
        return NextResponse.json({ success: true, data: warmingHistory });

      default:
        // Return comprehensive cache overview
        const [overviewPerformance, overviewInvalidation, overviewHealth, overviewWarming] = await Promise.all([
          cachePerformanceMonitor.getCachePerformanceByType(timeRange),
          cachePerformanceMonitor.getInvalidationPatterns(timeRange),
          cachePerformanceMonitor.getCacheHealthSummary(),
          cacheWarmingService.getWarmingMetrics()
        ]);

        return NextResponse.json({
          success: true,
          data: {
            performance: overviewPerformance,
            invalidationPatterns: overviewInvalidation,
            healthSummary: overviewHealth,
            warmingMetrics: overviewWarming,
            timeRange
          }
        });
    }

  } catch (error) {
    console.error('Cache management API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Admin verification
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await requireAdmin(session)
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { action, ...params } = await request.json();

    switch (action) {
      case 'execute-warming':
        const { strategyId } = params;
        if (!strategyId) {
          return NextResponse.json({
            success: false,
            error: 'Strategy ID is required'
          }, { status: 400 });
        }

        const warmingResult = await cacheWarmingService.executeStrategy(strategyId);
        return NextResponse.json({ success: true, data: warmingResult });

      case 'add-warming-strategy':
        const { strategy } = params;
        if (!strategy) {
          return NextResponse.json({
            success: false,
            error: 'Strategy configuration is required'
          }, { status: 400 });
        }

        cacheWarmingService.addStrategy(strategy);
        return NextResponse.json({ success: true, message: 'Strategy added successfully' });

      case 'update-warming-strategy':
        const { strategyId: updateStrategyId, enabled } = params;
        if (!updateStrategyId || typeof enabled !== 'boolean') {
          return NextResponse.json({
            success: false,
            error: 'Strategy ID and enabled status are required'
          }, { status: 400 });
        }

        const updateSuccess = cacheWarmingService.setStrategyEnabled(updateStrategyId, enabled);
        if (!updateSuccess) {
          return NextResponse.json({
            success: false,
            error: 'Strategy not found'
          }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Strategy updated successfully' });

      case 'remove-warming-strategy':
        const { strategyId: removeStrategyId } = params;
        if (!removeStrategyId) {
          return NextResponse.json({
            success: false,
            error: 'Strategy ID is required'
          }, { status: 400 });
        }

        const removeSuccess = cacheWarmingService.removeStrategy(removeStrategyId);
        if (!removeSuccess) {
          return NextResponse.json({
            success: false,
            error: 'Strategy not found'
          }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Strategy removed successfully' });

      case 'start-warming-service':
        cacheWarmingService.startScheduledWarming();
        return NextResponse.json({ success: true, message: 'Cache warming service started' });

      case 'stop-warming-service':
        cacheWarmingService.stopScheduledWarming();
        return NextResponse.json({ success: true, message: 'Cache warming service stopped' });

      case 'trigger-event-warming':
        const { eventName } = params;
        if (!eventName) {
          return NextResponse.json({
            success: false,
            error: 'Event name is required'
          }, { status: 400 });
        }

        await cacheWarmingService.triggerEventDrivenWarming(eventName);
        return NextResponse.json({ success: true, message: 'Event-driven warming triggered' });

      case 'emergency-invalidate-all':
        // Emergency cache invalidation - use with caution
        try {
          const supabase = getAdminSupabase()
          const { data, error } = await supabase.rpc('invalidate_all_cache');
          if (error) throw error;
          
          return NextResponse.json({ 
            success: true, 
            message: 'Emergency cache invalidation completed',
            invalidatedCount: data || 'unknown'
          });
        } catch (error) {
          console.error('Emergency cache invalidation failed:', error);
          return NextResponse.json({
            success: false,
            error: 'Emergency invalidation failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }

      case 'emergency-stop-warming':
        // Emergency stop all warming services
        cacheWarmingService.stopScheduledWarming();
        cacheWarmingService.stopPopularityTracking();
        
        return NextResponse.json({ 
          success: true, 
          message: 'All warming services stopped immediately' 
        });

      case 'emergency-reset-circuit-breaker':
        // Reset circuit breaker for warming service
        try {
          // This would need to be exposed in the warming service
          // For now, we'll restart the service
          cacheWarmingService.stopScheduledWarming();
          await new Promise(resolve => setTimeout(resolve, 1000));
          cacheWarmingService.startScheduledWarming();
          
          return NextResponse.json({ 
            success: true, 
            message: 'Circuit breaker reset - warming service restarted' 
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: 'Failed to reset circuit breaker',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }

      case 'get-system-status':
        // Get comprehensive system status for ops monitoring
        try {
          const [warmingMetrics, cacheHealth, popularityData] = await Promise.all([
            cacheWarmingService.getWarmingMetrics(),
            cachePerformanceMonitor.getCacheHealthSummary(),
            cacheWarmingService.getPopularityData()
          ]);

          return NextResponse.json({
            success: true,
            data: {
              warming: warmingMetrics,
              cache: cacheHealth,
              popularity: popularityData,
              timestamp: new Date().toISOString(),
              systemStatus: determineSystemStatus(warmingMetrics, cacheHealth)
            }
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: 'Failed to get system status',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Cache management POST API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

interface WarmingMetrics {
  success?: boolean
  errors?: number
  [key: string]: unknown
}

interface CacheHealth {
  overallHitRate?: number
  avgResponseTime?: number
  invalidationEfficiency?: number
  totalCacheEntries?: number
  recommendations?: string[]
  status?: string
  [key: string]: unknown
}

/**
 * Determine overall system status based on metrics
 */
function determineSystemStatus(warmingMetrics: WarmingMetrics, cacheHealth: CacheHealth): 'healthy' | 'warning' | 'critical' {
  // Check warming service health
  if (warmingMetrics.circuitBreakerStatus === 'open') return 'critical';
  if (warmingMetrics.backpressureStatus === 'critical') return 'critical';
  if (warmingMetrics.backpressureStatus === 'warning') return 'warning';
  
  // Check cache health
  if (cacheHealth.overallHitRate !== undefined && cacheHealth.overallHitRate < 20) return 'warning';
  if (cacheHealth.avgResponseTime !== undefined && cacheHealth.avgResponseTime > 1000) return 'warning';
  if (cacheHealth.invalidationEfficiency !== undefined && cacheHealth.invalidationEfficiency > 30) return 'warning';
  
  return 'healthy';
}

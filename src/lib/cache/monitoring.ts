import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface CachePerformanceMetrics {
  queryType: string;
  cacheHitRate: number;
  avgResponseTime: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  avgTTL: number;
  invalidationCount: number;
  lastAccessed: string;
}

export interface CacheInvalidationPattern {
  tag: string;
  frequency: number;
  avgBatchSize: number;
  lastInvalidated: string;
  relatedQueries: string[];
  impactScore: number;
}

export interface CacheTTLOptimization {
  queryType: string;
  currentTTL: number;
  recommendedTTL: number;
  reasoning: string;
  confidence: number;
  lastAdjustment?: string;
  adjustmentCount: number;
  isRateLimited: boolean;
}

export interface CacheSLO {
  name: string;
  target: number;
  current: number;
  status: 'met' | 'warning' | 'breached';
  description: string;
  alertThreshold: number;
  warningThreshold: number;
}

export interface AnomalyDetection {
  type: 'hit_rate_drop' | 'latency_spike' | 'invalidation_surge' | 'warming_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
  metrics: Record<string, number>;
  recommendations: string[];
}

export class CachePerformanceMonitor {
  private static instance: CachePerformanceMonitor;
  private metricsBuffer: Map<string, any[]> = new Map();
  private invalidationTracker: Map<string, number> = new Map();
  private ttlAdjustmentHistory: Map<string, { lastAdjustment: Date; adjustmentCount: number; lastValue: number }> = new Map();

  // SLO definitions
  private slos: CacheSLO[] = [
    {
      name: 'Overall Cache Hit Rate',
      target: 30,
      current: 0,
      status: 'met',
      description: 'Minimum 30% cache hit rate across all queries',
      alertThreshold: 20,
      warningThreshold: 25
    },
    {
      name: 'Search Query Hit Rate',
      target: 50,
      current: 0,
      status: 'met',
      description: 'Minimum 50% cache hit rate for search queries',
      alertThreshold: 40,
      warningThreshold: 45
    },
    {
      name: 'Average Response Time',
      target: 500,
      current: 0,
      status: 'met',
      description: 'Maximum 500ms average response time',
      alertThreshold: 800,
      warningThreshold: 600
    },
    {
      name: 'Cache Invalidation Efficiency',
      target: 20,
      current: 0,
      status: 'met',
      description: 'Maximum 20% invalidation rate',
      alertThreshold: 35,
      warningThreshold: 25
    }
  ];

  private anomalyHistory: AnomalyDetection[] = [];
  private baselineMetrics: Map<string, { avg: number; stdDev: number; lastUpdated: Date }> = new Map();

  private constructor() {
    this.initializeMetricsBuffer();
  }

  static getInstance(): CachePerformanceMonitor {
    if (!CachePerformanceMonitor.instance) {
      CachePerformanceMonitor.instance = new CachePerformanceMonitor();
    }
    return CachePerformanceMonitor.instance;
  }

  private initializeMetricsBuffer() {
    // Initialize buffer for different metric types
    ['search', 'analytics', 'user_data', 'vendor_data'].forEach(type => {
      this.metricsBuffer.set(type, []);
    });
  }

  /**
   * Record cache performance metrics for a specific query
   */
  async recordCacheMetrics(queryType: string, metrics: {
    cacheHit: boolean;
    responseTime: number;
    ttl: number;
    query: string;
    tags?: string[];
  }) {
    try {
      // Store in buffer for batch processing
      const bufferKey = this.getQueryTypeCategory(queryType);
      const buffer = this.metricsBuffer.get(bufferKey) || [];
      buffer.push({
        ...metrics,
        timestamp: new Date().toISOString(),
        queryType
      });

      // Flush buffer if it gets too large
      if (buffer.length >= 100) {
        await this.flushMetricsBuffer(bufferKey);
      }

      // Track invalidation patterns if this is a cache miss
      if (!metrics.cacheHit && metrics.tags) {
        this.trackInvalidationPattern(metrics.tags);
      }

    } catch (error) {
      console.error('Failed to record cache metrics:', error);
    }
  }

  /**
   * Get comprehensive cache performance metrics by query type
   */
  async getCachePerformanceByType(timeRange: string = '24h'): Promise<CachePerformanceMetrics[]> {
    try {
      const startTime = this.getTimeRangeStart(timeRange);
      
      const { data: performanceData, error: perfError } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('created_at', startTime.toISOString());

      if (perfError) {
        console.error('Failed to fetch performance data:', perfError);
        return [];
      }

      const { data: cacheData, error: cacheError } = await supabase
        .from('query_cache')
        .select('*')
        .gte('created_at', startTime.toISOString());

      if (cacheError) {
        console.error('Failed to fetch cache data:', cacheError);
        return [];
      }

      // Group metrics by query type
      const queryTypeMetrics = new Map<string, any[]>();
      performanceData?.forEach(metric => {
        const queryType = this.extractQueryType(metric.endpoint);
        if (!queryTypeMetrics.has(queryType)) {
          queryTypeMetrics.set(queryType, []);
        }
        queryTypeMetrics.get(queryType)!.push(metric);
      });

      // Calculate metrics for each query type
      const results: CachePerformanceMetrics[] = [];
      for (const [queryType, metrics] of queryTypeMetrics) {
        const cacheHits = metrics.filter(m => m.cache_hit).length;
        const totalRequests = metrics.length;
        const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
        
        const avgResponseTime = metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / totalRequests;
        
        // Find related cache entries
        const relatedCache = cacheData?.filter(c => 
          c.invalidation_tags?.some((tag: string) => tag.includes(queryType))
        ) || [];

        const avgTTL = relatedCache.length > 0 
          ? relatedCache.reduce((sum, c) => {
              const ttl = new Date(c.expires_at).getTime() - new Date(c.created_at).getTime();
              return sum + ttl;
            }, 0) / relatedCache.length
          : 0;

        const invalidationCount = this.invalidationTracker.get(queryType) || 0;

        results.push({
          queryType,
          cacheHitRate: Math.round(cacheHitRate * 100) / 100,
          avgResponseTime: Math.round(avgResponseTime),
          totalRequests,
          cacheHits,
          cacheMisses: totalRequests - cacheHits,
          avgTTL: Math.round(avgTTL / (1000 * 60)), // Convert to minutes
          invalidationCount,
          lastAccessed: relatedCache.length > 0 
            ? relatedCache[0].last_accessed 
            : new Date().toISOString()
        });
      }

      return results.sort((a, b) => b.totalRequests - a.totalRequests);

    } catch (error) {
      console.error('Failed to get cache performance by type:', error);
      return [];
    }
  }

  /**
   * Analyze invalidation patterns to identify optimization opportunities
   */
  async getInvalidationPatterns(timeRange: string = '24h'): Promise<CacheInvalidationPattern[]> {
    try {
      const startTime = this.getTimeRangeStart(timeRange);
      
      const { data: invalidationData, error } = await supabase
        .from('cache_invalidation_queue')
        .select('*')
        .gte('enqueued_at', startTime.toISOString());

      if (error) {
        console.error('Failed to fetch invalidation data:', error);
        return [];
      }

      // Group by tag and analyze patterns
      const tagPatterns = new Map<string, any[]>();
      invalidationData?.forEach(entry => {
        if (!tagPatterns.has(entry.tag)) {
          tagPatterns.set(entry.tag, []);
        }
        tagPatterns.get(entry.tag)!.push(entry);
      });

      const patterns: CacheInvalidationPattern[] = [];
      for (const [tag, entries] of tagPatterns) {
        const frequency = entries.length;
        const avgBatchSize = entries.reduce((sum, e) => sum + (e.batch_size || 1), 0) / entries.length;
        const lastInvalidated = entries[0]?.enqueued_at || new Date().toISOString();
        
        // Calculate impact score based on frequency and batch size
        const impactScore = Math.min(frequency * avgBatchSize / 100, 10);

        patterns.push({
          tag,
          frequency,
          avgBatchSize: Math.round(avgBatchSize),
          lastInvalidated,
          relatedQueries: this.getRelatedQueriesForTag(tag),
          impactScore: Math.round(impactScore * 10) / 10
        });
      }

      return patterns.sort((a, b) => b.impactScore - a.impactScore);

    } catch (error) {
      console.error('Failed to get invalidation patterns:', error);
      return [];
    }
  }

  /**
   * Get TTL optimization recommendations with safety controls
   */
  async getTTLOptimizations(): Promise<CacheTTLOptimization[]> {
    try {
      const performanceMetrics = await this.getCachePerformanceByType('7d');
      const invalidationPatterns = await this.getInvalidationPatterns('7d');

      const optimizations: CacheTTLOptimization[] = [];

      for (const metric of performanceMetrics) {
        const invalidationPattern = invalidationPatterns.find(p => 
          p.relatedQueries.includes(metric.queryType)
        );

        // Check if we can adjust TTL (rate limiting and oscillation prevention)
        const canAdjust = this.canAdjustTTL(metric.queryType, metric.avgTTL);
        
        if (!canAdjust.canAdjust) {
          optimizations.push({
            queryType: metric.queryType,
            currentTTL: metric.avgTTL,
            recommendedTTL: metric.avgTTL,
            reasoning: canAdjust.reason,
            confidence: 0,
            lastAdjustment: canAdjust.lastAdjustment,
            adjustmentCount: canAdjust.adjustmentCount,
            isRateLimited: true
          });
          continue;
        }

        let recommendedTTL = metric.avgTTL;
        let reasoning = '';
        let confidence = 0.5;

        // High cache hit rate + low invalidation = increase TTL
        if (metric.cacheHitRate > 80 && (invalidationPattern?.frequency || 0) < 5) {
          recommendedTTL = Math.min(metric.avgTTL * 1.2, 1440); // Max 24 hours, conservative 20% increase
          reasoning = 'High cache hit rate with low invalidation frequency suggests TTL can be increased';
          confidence = 0.8;
        }
        // Low cache hit rate + high invalidation = decrease TTL
        else if (metric.cacheHitRate < 30 && (invalidationPattern?.frequency || 0) > 20) {
          recommendedTTL = Math.max(metric.avgTTL * 0.8, 5); // Min 5 minutes, conservative 20% decrease
          reasoning = 'Low cache hit rate with high invalidation frequency suggests TTL should be decreased';
          confidence = 0.7;
        }
        // Moderate patterns = fine-tune based on response time
        else if (metric.avgResponseTime > 1000) {
          recommendedTTL = Math.min(metric.avgTTL * 1.1, 720); // Max 12 hours, conservative 10% increase
          reasoning = 'High response time suggests increasing TTL to reduce database load';
          confidence = 0.6;
        }

        // Only suggest if change is significant and safe
        const changePercent = Math.abs(recommendedTTL - metric.avgTTL) / metric.avgTTL * 100;
        if (changePercent > 10 && changePercent < 50) { // Between 10% and 50% change
          optimizations.push({
            queryType: metric.queryType,
            currentTTL: metric.avgTTL,
            recommendedTTL: Math.round(recommendedTTL),
            reasoning,
            confidence,
            lastAdjustment: canAdjust.lastAdjustment,
            adjustmentCount: canAdjust.adjustmentCount,
            isRateLimited: false
          });
        }
      }

      return optimizations.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('Failed to get TTL optimizations:', error);
      return [];
    }
  }

  /**
   * Get cache health summary with key metrics
   */
  async getCacheHealthSummary(): Promise<{
    overallHitRate: number;
    totalCacheEntries: number;
    avgResponseTime: number;
    invalidationEfficiency: number;
    recommendations: string[];
  }> {
    try {
      const performanceMetrics = await this.getCachePerformanceByType('24h');
      const invalidationPatterns = await this.getInvalidationPatterns('24h');

      if (performanceMetrics.length === 0) {
        return {
          overallHitRate: 0,
          totalCacheEntries: 0,
          avgResponseTime: 0,
          invalidationEfficiency: 0,
          recommendations: ['No cache performance data available']
        };
      }

      const overallHitRate = performanceMetrics.reduce((sum, m) => 
        sum + (m.cacheHitRate * m.totalRequests), 0
      ) / performanceMetrics.reduce((sum, m) => sum + m.totalRequests, 0);

      const avgResponseTime = performanceMetrics.reduce((sum, m) => 
        sum + (m.avgResponseTime * m.totalRequests), 0
      ) / performanceMetrics.reduce((sum, m) => sum + m.totalRequests, 0);

      // Calculate invalidation efficiency (lower is better)
      const totalInvalidations = invalidationPatterns.reduce((sum, p) => sum + p.frequency, 0);
      const totalCacheOperations = performanceMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
      const invalidationEfficiency = totalCacheOperations > 0 
        ? (totalInvalidations / totalCacheOperations) * 100 
        : 0;

      const recommendations: string[] = [];

      if (overallHitRate < 50) {
        recommendations.push('Cache hit rate is below 50%. Consider increasing TTL for frequently accessed data.');
      }

      if (invalidationEfficiency > 20) {
        recommendations.push('High invalidation rate detected. Review invalidation triggers and consider batching.');
      }

      if (avgResponseTime > 500) {
        recommendations.push('Average response time is high. Consider optimizing database queries and cache strategies.');
      }

      if (recommendations.length === 0) {
        recommendations.push('Cache performance is within optimal ranges.');
      }

      return {
        overallHitRate: Math.round(overallHitRate * 100) / 100,
        totalCacheEntries: performanceMetrics.length,
        avgResponseTime: Math.round(avgResponseTime),
        invalidationEfficiency: Math.round(invalidationEfficiency * 100) / 100,
        recommendations
      };

    } catch (error) {
      console.error('Failed to get cache health summary:', error);
      return {
        overallHitRate: 0,
        totalCacheEntries: 0,
        avgResponseTime: 0,
        invalidationEfficiency: 0,
        recommendations: ['Failed to analyze cache health']
      };
    }
  }

  /**
   * Check SLO compliance and update status
   */
  async checkSLOCompliance(): Promise<CacheSLO[]> {
    try {
      const healthSummary = await this.getCacheHealthSummary();
      const performanceMetrics = await this.getCachePerformanceByType('24h');
      
      // Update SLO current values
      this.slos[0].current = healthSummary.overallHitRate; // Overall hit rate
      this.slos[1].current = this.getSearchQueryHitRate(performanceMetrics); // Search hit rate
      this.slos[2].current = healthSummary.avgResponseTime; // Response time
      this.slos[3].current = healthSummary.invalidationEfficiency; // Invalidation efficiency

      // Update SLO status
      for (const slo of this.slos) {
        if (slo.current >= slo.target) {
          slo.status = 'met';
        } else if (slo.current >= slo.warningThreshold) {
          slo.status = 'warning';
        } else {
          slo.status = 'breached';
        }
      }

      return this.slos;

    } catch (error) {
      console.error('Failed to check SLO compliance:', error);
      return this.slos;
    }
  }

  /**
   * Get search query hit rate specifically
   */
  private getSearchQueryHitRate(metrics: CachePerformanceMetrics[]): number {
    const searchMetrics = metrics.filter(m => 
      m.queryType.includes('search') || m.queryType.includes('vendor_search')
    );
    
    if (searchMetrics.length === 0) return 0;
    
    const totalRequests = searchMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalHits = searchMetrics.reduce((sum, m) => sum + m.cacheHits, 0);
    
    return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
  }

  /**
   * Detect anomalies in cache performance
   */
  async detectAnomalies(): Promise<AnomalyDetection[]> {
    try {
      const anomalies: AnomalyDetection[] = [];
      const healthSummary = await this.getCacheHealthSummary();
      const performanceMetrics = await this.getCachePerformanceByType('1h'); // Last hour for anomaly detection
      
      // Update baseline metrics
      this.updateBaselineMetrics(performanceMetrics);

      // Check for hit rate anomalies
      const hitRateAnomaly = this.detectHitRateAnomaly(healthSummary.overallHitRate);
      if (hitRateAnomaly) anomalies.push(hitRateAnomaly);

      // Check for latency anomalies
      const latencyAnomaly = this.detectLatencyAnomaly(healthSummary.avgResponseTime);
      if (latencyAnomaly) anomalies.push(latencyAnomaly);

      // Check for invalidation anomalies
      const invalidationAnomaly = this.detectInvalidationAnomaly(healthSummary.invalidationEfficiency);
      if (invalidationAnomaly) anomalies.push(invalidationAnomaly);

      // Store new anomalies
      this.anomalyHistory.push(...anomalies);
      if (this.anomalyHistory.length > 100) {
        this.anomalyHistory = this.anomalyHistory.slice(-100);
      }

      return anomalies;

    } catch (error) {
      console.error('Failed to detect anomalies:', error);
      return [];
    }
  }

  /**
   * Update baseline metrics for anomaly detection
   */
  private updateBaselineMetrics(metrics: CachePerformanceMetrics[]): void {
    const now = new Date();
    
    for (const metric of metrics) {
      const key = `${metric.queryType}_response_time`;
      const existing = this.baselineMetrics.get(key);
      
      if (existing) {
        // Update baseline with exponential moving average
        const alpha = 0.1; // Smoothing factor
        existing.avg = alpha * metric.avgResponseTime + (1 - alpha) * existing.avg;
        existing.stdDev = alpha * Math.abs(metric.avgResponseTime - existing.avg) + (1 - alpha) * existing.stdDev;
        existing.lastUpdated = now;
      } else {
        this.baselineMetrics.set(key, {
          avg: metric.avgResponseTime,
          stdDev: metric.avgResponseTime * 0.2, // Initial estimate
          lastUpdated: now
        });
      }
    }
  }

  /**
   * Detect hit rate anomalies
   */
  private detectHitRateAnomaly(currentHitRate: number): AnomalyDetection | null {
    const baseline = this.baselineMetrics.get('overall_hit_rate');
    if (!baseline) return null;

    const drop = baseline.avg - currentHitRate;
    const dropPercent = (drop / baseline.avg) * 100;

    if (dropPercent > 30) { // 30% drop threshold
      return {
        type: 'hit_rate_drop',
        severity: dropPercent > 50 ? 'critical' : dropPercent > 40 ? 'high' : 'medium',
        description: `Cache hit rate dropped by ${dropPercent.toFixed(1)}% from baseline`,
        detectedAt: new Date().toISOString(),
        metrics: {
          current: currentHitRate,
          baseline: baseline.avg,
          drop: dropPercent
        },
        recommendations: [
          'Check for recent cache invalidations',
          'Review TTL settings for frequently accessed data',
          'Verify warming strategies are working correctly'
        ]
      };
    }

    return null;
  }

  /**
   * Detect latency anomalies
   */
  private detectLatencyAnomaly(currentLatency: number): AnomalyDetection | null {
    const baseline = this.baselineMetrics.get('overall_response_time');
    if (!baseline) return null;

    const increase = currentLatency - baseline.avg;
    const increasePercent = (increase / baseline.avg) * 100;

    if (increasePercent > 50) { // 50% increase threshold
      return {
        type: 'latency_spike',
        severity: increasePercent > 100 ? 'critical' : increasePercent > 75 ? 'high' : 'medium',
        description: `Response time increased by ${increasePercent.toFixed(1)}% from baseline`,
        detectedAt: new Date().toISOString(),
        metrics: {
          current: currentLatency,
          baseline: baseline.avg,
          increase: increasePercent
        },
        recommendations: [
          'Check database performance and connection pool',
          'Review cache hit rates and warming strategies',
          'Monitor for increased load or traffic spikes'
        ]
      };
    }

    return null;
  }

  /**
   * Detect invalidation anomalies
   */
  private detectInvalidationAnomaly(currentEfficiency: number): AnomalyDetection | null {
    const baseline = this.baselineMetrics.get('invalidation_efficiency');
    if (!baseline) return null;

    const increase = currentEfficiency - baseline.avg;
    const increasePercent = (increase / baseline.avg) * 100;

    if (increasePercent > 100) { // 100% increase threshold
      return {
        type: 'invalidation_surge',
        severity: increasePercent > 200 ? 'critical' : increasePercent > 150 ? 'high' : 'medium',
        description: `Cache invalidation rate increased by ${increasePercent.toFixed(1)}% from baseline`,
        detectedAt: new Date().toISOString(),
        metrics: {
          current: currentEfficiency,
          baseline: baseline.avg,
          increase: increasePercent
        },
        recommendations: [
          'Check for bulk data updates or migrations',
          'Review invalidation triggers and policies',
          'Consider batching invalidations to reduce frequency'
        ]
      };
    }

    return null;
  }

  /**
   * Get anomaly history
   */
  getAnomalyHistory(limit: number = 50): AnomalyDetection[] {
    return this.anomalyHistory
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get SLO summary for dashboard
   */
  getSLOSummary(): {
    total: number;
    met: number;
    warning: number;
    breached: number;
    slos: CacheSLO[];
  } {
    const met = this.slos.filter(s => s.status === 'met').length;
    const warning = this.slos.filter(s => s.status === 'warning').length;
    const breached = this.slos.filter(s => s.status === 'breached').length;

    return {
      total: this.slos.length,
      met,
      warning,
      breached,
      slos: this.slos
    };
  }

  private getQueryTypeCategory(queryType: string): string {
    if (queryType.includes('search')) return 'search';
    if (queryType.includes('analytics')) return 'analytics';
    if (queryType.includes('user') || queryType.includes('profile')) return 'user_data';
    if (queryType.includes('vendor') || queryType.includes('provider')) return 'vendor_data';
    return 'other';
  }

  private extractQueryType(endpoint: string): string {
    // Extract meaningful query type from endpoint
    const parts = endpoint.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}_${parts[1]}`;
    }
    return parts[0] || 'unknown';
  }

  private getTimeRangeStart(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
      case '6h': return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private trackInvalidationPattern(tags: string[]) {
    tags.forEach(tag => {
      const current = this.invalidationTracker.get(tag) || 0;
      this.invalidationTracker.set(tag, current + 1);
    });
  }

  private getRelatedQueriesForTag(tag: string): string[] {
    // Map tags to related query types
    const tagMapping: Record<string, string[]> = {
      'vendor': ['vendor_search', 'vendor_profile', 'vendor_services'],
      'specialty': ['specialty_search', 'specialty_tree', 'specialty_vendors'],
      'location': ['geo_search', 'location_search', 'nearby_vendors'],
      'analytics': ['analytics_dashboard', 'analytics_reports', 'analytics_summary']
    };

    for (const [key, queries] of Object.entries(tagMapping)) {
      if (tag.includes(key)) {
        return queries;
      }
    }

    return [tag];
  }

  private async flushMetricsBuffer(bufferKey: string) {
    try {
      const buffer = this.metricsBuffer.get(bufferKey) || [];
      if (buffer.length === 0) return;

      // Process and store metrics in database
      // This could be enhanced to store in a dedicated cache_metrics table
      console.log(`Flushed ${buffer.length} metrics for ${bufferKey}`);
      
      // Clear buffer after processing
      this.metricsBuffer.set(bufferKey, []);
    } catch (error) {
      console.error('Failed to flush metrics buffer:', error);
    }
  }

  /**
   * Check if TTL can be safely adjusted (rate limiting + oscillation prevention)
   */
  private canAdjustTTL(queryType: string, currentTTL: number): {
    canAdjust: boolean;
    reason: string;
    lastAdjustment?: string;
    adjustmentCount: number;
  } {
    const history = this.ttlAdjustmentHistory.get(queryType);
    const now = new Date();

    // Rate limiting: only adjust every 6 hours
    if (history && (now.getTime() - history.lastAdjustment.getTime()) < 6 * 60 * 60 * 1000) {
      return {
        canAdjust: false,
        reason: 'Rate limited: TTL adjustments allowed every 6 hours',
        lastAdjustment: history.lastAdjustment.toISOString(),
        adjustmentCount: history.adjustmentCount
      };
    }

    // Oscillation prevention: check if we're bouncing between values
    if (history && history.adjustmentCount > 3) {
      const recentChanges = Math.abs(currentTTL - history.lastValue) / history.lastValue;
      if (recentChanges < 0.1) { // Less than 10% change suggests oscillation
        return {
          canAdjust: false,
          reason: 'Oscillation detected: TTL bouncing between values',
          lastAdjustment: history.lastAdjustment.toISOString(),
          adjustmentCount: history.adjustmentCount
        };
      }
    }

    // Bounded adjustments: prevent extreme values
    if (currentTTL < 5 || currentTTL > 1440) {
      return {
        canAdjust: false,
        reason: 'TTL out of safe bounds (5-1440 minutes)',
        lastAdjustment: history?.lastAdjustment.toISOString(),
        adjustmentCount: history?.adjustmentCount || 0
      };
    }

    return {
      canAdjust: true,
      reason: 'Safe to adjust',
      lastAdjustment: history?.lastAdjustment.toISOString(),
      adjustmentCount: history?.adjustmentCount || 0
    };
  }

  /**
   * Record TTL adjustment to prevent oscillation
   */
  recordTTLAdjustment(queryType: string, oldTTL: number, newTTL: number): void {
    const history = this.ttlAdjustmentHistory.get(queryType) || {
      lastAdjustment: new Date(0),
      adjustmentCount: 0,
      lastValue: oldTTL
    };

    this.ttlAdjustmentHistory.set(queryType, {
      lastAdjustment: new Date(),
      adjustmentCount: history.adjustmentCount + 1,
      lastValue: newTTL
    });
  }
}

// Export singleton instance
export const cachePerformanceMonitor = CachePerformanceMonitor.getInstance();

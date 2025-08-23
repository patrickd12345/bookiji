import { createClient } from '@supabase/supabase-js';
import { cachePerformanceMonitor } from './monitoring';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface CacheWarmingStrategy {
  id: string;
  name: string;
  description: string;
  queries: WarmingQuery[];
  schedule: WarmingSchedule;
  enabled: boolean;
  priority: number;
  lastRun?: string;
  successRate: number;
  avgDuration: number;
}

export interface WarmingQuery {
  endpoint: string;
  params: Record<string, any>;
  tags: string[];
  expectedTTL: number;
  priority: number;
  popularity?: number; // Dynamic popularity score
  lastAccessed?: string; // When this query was last accessed
}

export interface WarmingSchedule {
  type: 'interval' | 'cron' | 'event-driven';
  value: string; // interval in minutes, cron expression, or event name
  timeWindow?: string; // e.g., '9-17' for business hours
  maxConcurrency: number;
}

export interface WarmingResult {
  strategyId: string;
  queriesExecuted: number;
  queriesSucceeded: number;
  queriesFailed: number;
  totalDuration: number;
  cacheEntriesCreated: number;
  errors: string[];
  timestamp: string;
}

export class CacheWarmingService {
  private static instance: CacheWarmingService;
  private strategies: Map<string, CacheWarmingStrategy> = new Map();
  private warmingHistory: WarmingResult[] = [];
  private isWarming: boolean = false;
  private warmingQueue: string[] = [];
  private queryPopularity: Map<string, { count: number; lastAccessed: Date; score: number }> = new Map();
  private popularityUpdateInterval: NodeJS.Timeout | null = null;
  
  // Enhanced concurrency control
  private activeWorkers: number = 0;
  private maxConcurrentWorkers: number = 5;
  private circuitBreaker: { failures: number; lastFailure: Date; isOpen: boolean } = {
    failures: 0,
    lastFailure: new Date(0),
    isOpen: false
  };
  private backpressureThreshold: number = 100; // Max queued items

  private constructor() {
    this.initializeDefaultStrategies();
  }

  static getInstance(): CacheWarmingService {
    if (!CacheWarmingService.instance) {
      CacheWarmingService.instance = new CacheWarmingService();
    }
    return CacheWarmingService.instance;
  }

  private initializeDefaultStrategies() {
    // High-priority search queries with dynamic popularity tracking
    this.addStrategy({
      id: 'dynamic_popular_search',
      name: 'Dynamic Popular Search Queries',
      description: 'Automatically warms up most popular search queries based on real usage',
      queries: [
        {
          endpoint: '/api/search/providers/optimized',
          params: { query: 'plumber', limit: '20', maxTravelDistance: '20' },
          tags: ['search', 'vendor', 'dynamic_popular'],
          expectedTTL: 30,
          priority: 1,
          popularity: 0
        }
      ],
      schedule: {
        type: 'interval',
        value: '15', // Every 15 minutes
        maxConcurrency: 3
      },
      enabled: true,
      priority: 1,
      successRate: 0,
      avgDuration: 0
    });

    // Specialty tree queries
    this.addStrategy({
      id: 'specialty_tree',
      name: 'Specialty Tree Navigation',
      description: 'Warms up specialty tree structure for fast navigation',
      queries: [
        {
          endpoint: '/api/specialties/tree',
          params: { includeCounts: 'true' },
          tags: ['specialty', 'tree', 'navigation'],
          expectedTTL: 60,
          priority: 2
        }
      ],
      schedule: {
        type: 'interval',
        value: '30', // Every 30 minutes
        maxConcurrency: 1
      },
      enabled: true,
      priority: 2,
      successRate: 0,
      avgDuration: 0
    });

    // Analytics dashboard queries
    this.addStrategy({
      id: 'analytics_dashboard',
      name: 'Analytics Dashboard',
      description: 'Warms up analytics queries for admin dashboard',
      queries: [
        {
          endpoint: '/api/admin/analytics/summary',
          params: { timeRange: '24h' },
          tags: ['analytics', 'admin', 'dashboard'],
          expectedTTL: 15,
          priority: 3
        },
        {
          endpoint: '/api/admin/analytics/trends',
          params: { timeRange: '7d', granularity: 'hour' },
          tags: ['analytics', 'admin', 'trends'],
          expectedTTL: 15,
          priority: 3
        }
      ],
      schedule: {
        type: 'interval',
        value: '10', // Every 10 minutes
        maxConcurrency: 2
      },
      enabled: true,
      priority: 3,
      successRate: 0,
      avgDuration: 0
    });

    // Event-driven strategies
    this.addStrategy({
      id: 'user_activity_triggered',
      name: 'User Activity Triggered',
      description: 'Warms up related queries when users perform actions',
      queries: [
        {
          endpoint: '/api/search/providers/optimized',
          params: { query: 'landscaping', limit: '20', maxTravelDistance: '20' },
          tags: ['search', 'vendor', 'user_triggered'],
          expectedTTL: 20,
          priority: 4
        }
      ],
      schedule: {
        type: 'event-driven',
        value: 'user_search',
        maxConcurrency: 2
      },
      enabled: true,
      priority: 4,
      successRate: 0,
      avgDuration: 0
    });
  }

  /**
   * Add a new warming strategy
   */
  addStrategy(strategy: CacheWarmingStrategy): void {
    this.strategies.set(strategy.id, strategy);
    console.log(`Added cache warming strategy: ${strategy.name}`);
  }

  /**
   * Remove a warming strategy
   */
  removeStrategy(strategyId: string): boolean {
    return this.strategies.delete(strategyId);
  }

  /**
   * Enable or disable a strategy
   */
  setStrategyEnabled(strategyId: string, enabled: boolean): boolean {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get all strategies
   */
  getStrategies(): CacheWarmingStrategy[] {
    return Array.from(this.strategies.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute warming for a specific strategy with enhanced concurrency control
   */
  async executeStrategy(strategyId: string): Promise<WarmingResult> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy || !strategy.enabled) {
      throw new Error(`Strategy ${strategyId} not found or disabled`);
    }

    // Check circuit breaker
    if (this.circuitBreaker.isOpen) {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailure.getTime();
      if (timeSinceLastFailure < 5 * 60 * 1000) { // 5 minute cooldown
        throw new Error('Circuit breaker is open - warming service temporarily disabled');
      } else {
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failures = 0;
      }
    }

    // Check backpressure
    if (this.warmingQueue.length > this.backpressureThreshold) {
      throw new Error(`Backpressure threshold exceeded: ${this.warmingQueue.length} items queued`);
    }

    const startTime = Date.now();
    const result: WarmingResult = {
      strategyId,
      queriesExecuted: 0,
      queriesSucceeded: 0,
      queriesFailed: 0,
      totalDuration: 0,
      cacheEntriesCreated: 0,
      errors: [],
      timestamp: new Date().toISOString()
    };

    try {
      console.log(`Executing cache warming strategy: ${strategy.name}`);

      // Sort queries by priority
      const sortedQueries = [...strategy.queries].sort((a, b) => a.priority - b.priority);
      
      // Execute queries with enhanced concurrency control
      const concurrencyLimit = Math.min(strategy.schedule.maxConcurrency, this.maxConcurrentWorkers);
      const queryBatches = this.chunkArray(sortedQueries, concurrencyLimit);

      for (const batch of queryBatches) {
        // Wait for available worker slots
        await this.waitForWorkerSlot();
        
        const batchPromises = batch.map(query => this.executeWarmingQuery(query));
        const batchResults = await Promise.allSettled(batchPromises);

        for (const batchResult of batchResults) {
          result.queriesExecuted++;
          
          if (batchResult.status === 'fulfilled') {
            result.queriesSucceeded++;
            if (batchResult.value.cacheCreated) {
              result.cacheEntriesCreated++;
            }
            // Reset circuit breaker on success
            this.circuitBreaker.failures = 0;
          } else {
            result.queriesFailed++;
            result.errors.push(batchResult.reason?.message || 'Unknown error');
            
            // Increment failure count for circuit breaker
            this.circuitBreaker.failures++;
            this.circuitBreaker.lastFailure = new Date();
            
            if (this.circuitBreaker.failures >= 5) {
              this.circuitBreaker.isOpen = true;
              console.warn('Circuit breaker opened due to repeated failures');
            }
          }
        }
        
        // Release worker slots
        this.releaseWorkerSlot();
        
        // Adaptive delay between batches based on system load
        const delay = this.calculateAdaptiveDelay();
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      result.totalDuration = Date.now() - startTime;
      
      // Update strategy metrics
      this.updateStrategyMetrics(strategyId, result);
      
      // Store warming history
      this.warmingHistory.push(result);
      if (this.warmingHistory.length > 100) {
        this.warmingHistory = this.warmingHistory.slice(-100);
      }

      console.log(`Cache warming strategy ${strategy.name} completed: ${result.queriesSucceeded}/${result.queriesExecuted} queries succeeded`);

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error(`Cache warming strategy ${strategyId} failed:`, error);
      
      // Update circuit breaker on strategy failure
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailure = new Date();
    }

    return result;
  }

  /**
   * Execute a single warming query
   */
  private async executeWarmingQuery(query: WarmingQuery): Promise<{
    success: boolean;
    cacheCreated: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Build query URL with parameters
      const url = new URL(query.endpoint, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
      Object.entries(query.params).forEach(([key, value]) => {
        url.searchParams.set(key, value.toString());
      });

      // Execute query
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-Cache-Warming': 'true',
          'X-Warming-Strategy': 'cache-warming-service'
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        // Record cache metrics
        await cachePerformanceMonitor.recordCacheMetrics('cache_warming', {
          cacheHit: false, // Warming queries are always cache misses initially
          responseTime,
          ttl: query.expectedTTL,
          query: query.endpoint,
          tags: query.tags
        });

        return {
          success: true,
          cacheCreated: true,
          responseTime
        };
      } else {
        return {
          success: false,
          cacheCreated: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        cacheCreated: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start scheduled warming based on strategies
   */
  startScheduledWarming(): void {
    if (this.isWarming) {
      console.log('Cache warming service already running');
      return;
    }

    this.isWarming = true;
    console.log('Starting scheduled cache warming service');

    // Process interval-based strategies
    setInterval(() => {
      this.processIntervalStrategies();
    }, 60000); // Check every minute

    // Process cron-based strategies (simplified implementation)
    setInterval(() => {
      this.processCronStrategies();
    }, 60000); // Check every minute

    console.log('Scheduled cache warming service started');
  }

  /**
   * Stop scheduled warming
   */
  stopScheduledWarming(): void {
    this.isWarming = false;
    console.log('Scheduled cache warming service stopped');
  }

  /**
   * Process interval-based strategies
   */
  private async processIntervalStrategies(): Promise<void> {
    const now = Date.now();
    
    for (const strategy of this.strategies.values()) {
      if (!strategy.enabled || strategy.schedule.type !== 'interval') continue;

      const intervalMs = parseInt(strategy.schedule.value) * 60 * 1000;
      const lastRun = strategy.lastRun ? new Date(strategy.lastRun).getTime() : 0;
      
      if (now - lastRun >= intervalMs) {
        // Add to warming queue
        this.warmingQueue.push(strategy.id);
        
        // Process queue if not already processing
        if (!this.isWarming) {
          this.processWarmingQueue();
        }
      }
    }
  }

  /**
   * Process cron-based strategies (simplified)
   */
  private async processCronStrategies(): Promise<void> {
    // Simplified cron processing - could be enhanced with proper cron parsing
    const now = new Date();
    const hour = now.getHours();
    
    for (const strategy of this.strategies.values()) {
      if (!strategy.enabled || strategy.schedule.type !== 'cron') continue;

      // Simple time window check
      if (strategy.schedule.timeWindow) {
        const [start, end] = strategy.schedule.timeWindow.split('-').map(Number);
        if (hour >= start && hour < end) {
          this.warmingQueue.push(strategy.id);
        }
      }
    }
  }

  /**
   * Process the warming queue
   */
  private async processWarmingQueue(): Promise<void> {
    if (this.warmingQueue.length === 0) return;

    this.isWarming = true;
    
    while (this.warmingQueue.length > 0) {
      const strategyId = this.warmingQueue.shift()!;
      
      try {
        await this.executeStrategy(strategyId);
        
        // Update last run time
        const strategy = this.strategies.get(strategyId);
        if (strategy) {
          strategy.lastRun = new Date().toISOString();
        }
        
      } catch (error) {
        console.error(`Failed to execute warming strategy ${strategyId}:`, error);
      }
      
      // Small delay between strategies to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.isWarming = false;
  }

  /**
   * Trigger warming for a specific event
   */
  async triggerEventDrivenWarming(eventName: string): Promise<void> {
    const eventStrategies = Array.from(this.strategies.values())
      .filter(s => s.enabled && s.schedule.type === 'event-driven' && s.schedule.value === eventName);

    for (const strategy of eventStrategies) {
      this.warmingQueue.push(strategy.id);
    }

    if (!this.isWarming) {
      this.processWarmingQueue();
    }
  }

  /**
   * Get enhanced warming metrics including concurrency and circuit breaker status
   */
  getWarmingMetrics(): {
    totalStrategies: number;
    enabledStrategies: number;
    totalQueriesExecuted: number;
    avgSuccessRate: number;
    avgDuration: number;
    lastWarmingRun?: string;
    activeWorkers: number;
    maxConcurrentWorkers: number;
    queueLength: number;
    circuitBreakerStatus: 'closed' | 'open' | 'half-open';
    backpressureStatus: 'normal' | 'warning' | 'critical';
  } {
    const strategies = Array.from(this.strategies.values());
    const enabledStrategies = strategies.filter(s => s.enabled);
    
    const totalQueriesExecuted = this.warmingHistory.reduce((sum, r) => sum + r.queriesExecuted, 0);
    const avgSuccessRate = totalQueriesExecuted > 0 
      ? this.warmingHistory.reduce((sum, r) => sum + (r.queriesSucceeded / r.queriesExecuted), 0) / this.warmingHistory.length * 100
      : 0;
    
    const avgDuration = this.warmingHistory.length > 0
      ? this.warmingHistory.reduce((sum, r) => sum + r.totalDuration, 0) / this.warmingHistory.length
      : 0;

    const lastWarmingRun = this.warmingHistory.length > 0 
      ? this.warmingHistory[this.warmingHistory.length - 1].timestamp 
      : undefined;

    // Determine backpressure status
    let backpressureStatus: 'normal' | 'warning' | 'critical' = 'normal';
    if (this.warmingQueue.length > this.backpressureThreshold * 0.8) {
      backpressureStatus = 'warning';
    }
    if (this.warmingQueue.length > this.backpressureThreshold) {
      backpressureStatus = 'critical';
    }

    return {
      totalStrategies: strategies.length,
      enabledStrategies: enabledStrategies.length,
      totalQueriesExecuted,
      avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
      avgDuration: Math.round(avgDuration),
      lastWarmingRun,
      activeWorkers: this.activeWorkers,
      maxConcurrentWorkers: this.maxConcurrentWorkers,
      queueLength: this.warmingQueue.length,
      circuitBreakerStatus: this.circuitBreaker.isOpen ? 'open' : 'closed',
      backpressureStatus
    };
  }

  /**
   * Get warming history
   */
  getWarmingHistory(limit: number = 50): WarmingResult[] {
    return this.warmingHistory.slice(-limit);
  }

  /**
   * Update strategy metrics based on execution results
   */
  private updateStrategyMetrics(strategyId: string, result: WarmingResult): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;

    // Update success rate
    const currentSuccessRate = strategy.successRate;
    const newSuccessRate = result.queriesExecuted > 0 
      ? (result.queriesSucceeded / result.queriesExecuted) * 100 
      : 0;
    
    strategy.successRate = Math.round((currentSuccessRate + newSuccessRate) / 2 * 100) / 100;

    // Update average duration
    const currentAvgDuration = strategy.avgDuration;
    strategy.avgDuration = Math.round((currentAvgDuration + result.totalDuration) / 2);
  }

  /**
   * Helper to chunk array for concurrency control
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Start popularity tracking and dynamic strategy updates
   */
  startPopularityTracking(): void {
    if (this.popularityUpdateInterval) return;

    // Update popularity scores every 5 minutes
    this.popularityUpdateInterval = setInterval(() => {
      this.updatePopularityScores();
      this.updateDynamicStrategies();
    }, 5 * 60 * 1000);

    console.log('Popularity tracking started');
  }

  /**
   * Stop popularity tracking
   */
  stopPopularityTracking(): void {
    if (this.popularityUpdateInterval) {
      clearInterval(this.popularityUpdateInterval);
      this.popularityUpdateInterval = null;
      console.log('Popularity tracking stopped');
    }
  }

  /**
   * Record query access for popularity tracking
   */
  recordQueryAccess(endpoint: string, params: Record<string, any>): void {
    const queryKey = this.generateQueryKey(endpoint, params);
    const now = new Date();
    
    const existing = this.queryPopularity.get(queryKey) || {
      count: 0,
      lastAccessed: now,
      score: 0
    };

    // Update popularity score with time decay
    const timeSinceLastAccess = (now.getTime() - existing.lastAccessed.getTime()) / (1000 * 60 * 60); // hours
    const decayFactor = Math.exp(-timeSinceLastAccess / 24); // 24-hour half-life
    
    existing.count += 1;
    existing.lastAccessed = now;
    existing.score = existing.count * decayFactor;

    this.queryPopularity.set(queryKey, existing);
  }

  /**
   * Update popularity scores with time decay
   */
  private updatePopularityScores(): void {
    const now = new Date();
    
    for (const [queryKey, data] of this.queryPopularity) {
      const timeSinceLastAccess = (now.getTime() - data.lastAccessed.getTime()) / (1000 * 60 * 60);
      const decayFactor = Math.exp(-timeSinceLastAccess / 24);
      data.score = data.count * decayFactor;
      
      // Remove very old queries to prevent memory bloat
      if (timeSinceLastAccess > 168) { // 1 week
        this.queryPopularity.delete(queryKey);
      }
    }
  }

  /**
   * Update dynamic strategies based on current popularity
   */
  private updateDynamicStrategies(): void {
    const dynamicStrategy = this.strategies.get('dynamic_popular_search');
    if (!dynamicStrategy) return;

    // Get top 10 most popular search queries
    const topQueries = Array.from(this.queryPopularity.entries())
      .filter(([key, data]) => key.includes('search') && data.score > 0.1)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 10);

    // Update strategy with popular queries
    const popularQueries: WarmingQuery[] = topQueries.map(([queryKey, data], index) => {
      const [endpoint, params] = this.parseQueryKey(queryKey);
      return {
        endpoint,
        params,
        tags: ['search', 'vendor', 'dynamic_popular'],
        expectedTTL: 30,
        priority: 1 + (index * 0.1), // Slight priority variation
        popularity: data.score,
        lastAccessed: data.lastAccessed.toISOString()
      };
    });

    // Keep at least one default query if no popular ones
    if (popularQueries.length === 0) {
      popularQueries.push({
        endpoint: '/api/search/providers/optimized',
        params: { query: 'plumber', limit: '20', maxTravelDistance: '20' },
        tags: ['search', 'vendor', 'fallback'],
        expectedTTL: 30,
        priority: 1,
        popularity: 0
      });
    }

    dynamicStrategy.queries = popularQueries;
    console.log(`Updated dynamic strategy with ${popularQueries.length} popular queries`);
  }

  /**
   * Generate a unique key for a query
   */
  private generateQueryKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}?${sortedParams}`;
  }

  /**
   * Parse a query key back to endpoint and params
   */
  private parseQueryKey(queryKey: string): [string, Record<string, any>] {
    const [endpoint, queryString] = queryKey.split('?');
    const params: Record<string, any> = {};
    
    if (queryString) {
      queryString.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key] = value;
        }
      });
    }
    
    return [endpoint, params];
  }

  /**
   * Get current popularity data for monitoring
   */
  getPopularityData(): Array<{
    query: string;
    count: number;
    score: number;
    lastAccessed: string;
  }> {
    return Array.from(this.queryPopularity.entries())
      .map(([queryKey, data]) => ({
        query: queryKey,
        count: data.count,
        score: Math.round(data.score * 100) / 100,
        lastAccessed: data.lastAccessed.toISOString()
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  /**
   * Wait for an available worker slot
   */
  private async waitForWorkerSlot(): Promise<void> {
    while (this.activeWorkers >= this.maxConcurrentWorkers) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.activeWorkers++;
  }

  /**
   * Release a worker slot
   */
  private releaseWorkerSlot(): void {
    this.activeWorkers = Math.max(0, this.activeWorkers - 1);
  }

  /**
   * Calculate adaptive delay between batches based on system load
   */
  private calculateAdaptiveDelay(): number {
    const queueLength = this.warmingQueue.length;
    const activeWorkers = this.activeWorkers;
    
    // Base delay: 1 second
    let delay = 1000;
    
    // Increase delay if queue is long
    if (queueLength > 50) {
      delay += 2000;
    }
    
    // Increase delay if many workers are active
    if (activeWorkers > this.maxConcurrentWorkers * 0.8) {
      delay += 1000;
    }
    
    // Add jitter to prevent thundering herd
    delay += Math.random() * 500;
    
    return delay;
  }
}

// Export singleton instance
export const cacheWarmingService = CacheWarmingService.getInstance();

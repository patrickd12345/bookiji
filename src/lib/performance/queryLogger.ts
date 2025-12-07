import { getServerSupabase } from '@/lib/supabaseClient';

const getSupabaseClient = () => getServerSupabase()

export interface QueryMetrics {
  query: string;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
  executionTime: number;
  rowCount?: number;
  timestamp: Date;
  userId?: string;
  endpoint?: string;
  costEstimate?: number;
}

export interface PerformanceThresholds {
  slowQueryThreshold: number; // ms
  expensiveQueryThreshold: number; // estimated cost
  maxRowsPerQuery: number;
}

export class QueryLogger {
  private static instance: QueryLogger;
  private metrics: QueryMetrics[] = [];
  private thresholds: PerformanceThresholds = {
    slowQueryThreshold: 500, // 500ms
    expensiveQueryThreshold: 100, // $0.01
    maxRowsPerQuery: 1000
  };

  private constructor() {}

  public static getInstance(): QueryLogger {
    if (!QueryLogger.instance) {
      QueryLogger.instance = new QueryLogger();
    }
    return QueryLogger.instance;
  }

  public setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  public async logQuery(metrics: Omit<QueryMetrics, 'timestamp'>): Promise<void> {
    const fullMetrics: QueryMetrics = {
      ...metrics,
      timestamp: new Date()
    };

    this.metrics.push(fullMetrics);

    // Check if query exceeds thresholds
    await this.checkThresholds(fullMetrics);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private async checkThresholds(metrics: QueryMetrics): Promise<void> {
    const warnings: string[] = [];

    if (metrics.executionTime > this.thresholds.slowQueryThreshold) {
      warnings.push(`Slow query: ${metrics.executionTime}ms (threshold: ${this.thresholds.slowQueryThreshold}ms)`);
    }

    if (metrics.costEstimate && metrics.costEstimate > this.thresholds.expensiveQueryThreshold) {
      warnings.push(`Expensive query: $${metrics.costEstimate} (threshold: $${this.thresholds.expensiveQueryThreshold})`);
    }

    if (metrics.rowCount && metrics.rowCount > this.thresholds.maxRowsPerQuery) {
      warnings.push(`Large result set: ${metrics.rowCount} rows (threshold: ${this.thresholds.maxRowsPerQuery})`);
    }

    if (warnings.length > 0) {
      console.warn(`Performance warning for ${metrics.operation} on ${metrics.table}:`, warnings.join(', '));
      
      // Log to performance_metrics table if available
      await this.logToDatabase(metrics, warnings);
    }
  }

  private async logToDatabase(metrics: QueryMetrics, warnings: string[]): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // Try to insert into performance_metrics table
      const { error } = await supabase
        .from('performance_metrics')
        .insert({
          query: metrics.query,
          table: metrics.table,
          operation: metrics.operation,
          execution_time: metrics.executionTime,
          row_count: metrics.rowCount || 0,
          cost_estimate: metrics.costEstimate || 0,
          warnings: warnings.join('; '),
          user_id: metrics.userId,
          endpoint: metrics.endpoint,
          created_at: metrics.timestamp.toISOString()
        });

      if (error) {
        console.error('Failed to log performance metrics to database:', error);
      }
    } catch (error) {
      console.error('Error logging performance metrics:', error);
    }
  }

  public getMetrics(timeRange?: { start: Date; end: Date }): QueryMetrics[] {
    if (!timeRange) {
      return [...this.metrics];
    }

    return this.metrics.filter(
      metric => metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  public getPerformanceSummary(timeRange?: { start: Date; end: Date }): {
    totalQueries: number;
    slowQueries: number;
    expensiveQueries: number;
    averageExecutionTime: number;
    totalCost: number;
  } {
    const metrics = this.getMetrics(timeRange);
    
    if (metrics.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        expensiveQueries: 0,
        averageExecutionTime: 0,
        totalCost: 0
      };
    }

    const slowQueries = metrics.filter(m => m.executionTime > this.thresholds.slowQueryThreshold).length;
    const expensiveQueries = metrics.filter(m => m.costEstimate && m.costEstimate > this.thresholds.expensiveQueryThreshold).length;
    const averageExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
    const totalCost = metrics.reduce((sum, m) => sum + (m.costEstimate || 0), 0);

    return {
      totalQueries: metrics.length,
      slowQueries,
      expensiveQueries,
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
      totalCost: Math.round(totalCost * 1000000) / 1000000 // Round to 6 decimal places
    };
  }

  public clearMetrics(): void {
    this.metrics = [];
  }

  public exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Export singleton instance
export const queryLogger = QueryLogger.getInstance();

// Utility function to wrap database operations with logging
export async function withQueryLogging<T>(
  operation: () => Promise<T>,
  metrics: Omit<QueryMetrics, 'executionTime' | 'timestamp'>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const executionTime = performance.now() - startTime;
    
    await queryLogger.logQuery({
      ...metrics,
      executionTime
    });
    
    return result;
  } catch (error) {
    const executionTime = performance.now() - startTime;
    
    await queryLogger.logQuery({
      ...metrics,
      executionTime
    });
    
    throw error;
  }
}


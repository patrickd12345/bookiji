import { NextRequest, NextResponse } from 'next/server';
import { cachePerformanceMonitor } from './monitoring';

export interface CacheMetrics {
  cacheHit: boolean;
  responseTime: number;
  ttl: number;
  query: string;
  tags?: string[];
}

/**
 * Middleware to record cache performance metrics for API requests
 */
export function withCacheMetrics(
  handler: (request: NextRequest) => Promise<NextResponse>,
  queryType: string,
  tags: string[] = []
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let cacheHit = false;
    let ttl = 0;

    try {
      // Check if response is cached (this would be implemented based on your caching strategy)
      const cacheKey = generateCacheKey(request);
      const cachedResponse = await checkCache(cacheKey);
      
      if (cachedResponse) {
        cacheHit = true;
        ttl = cachedResponse.ttl;
      }

      // Execute the original handler
      const response = await handler(request);

      // Record cache metrics
      const responseTime = Date.now() - startTime;
      await cachePerformanceMonitor.recordCacheMetrics(queryType, {
        cacheHit,
        responseTime,
        ttl,
        query: request.url,
        tags
      });

      return response;

    } catch (error) {
      // Record error metrics
      const responseTime = Date.now() - startTime;
      await cachePerformanceMonitor.recordCacheMetrics(queryType, {
        cacheHit: false,
        responseTime,
        ttl: 0,
        query: request.url,
        tags
      });

      throw error;
    }
  };
}

/**
 * Generate a cache key for the request
 */
function generateCacheKey(request: NextRequest): string {
  const url = new URL(request.url);
  const method = request.method;
  const searchParams = url.searchParams.toString();
  
  // Create a deterministic cache key
  return `${method}:${url.pathname}:${searchParams}`;
}

/**
 * Check if a response is cached (placeholder implementation)
 */
async function checkCache(cacheKey: string): Promise<{ ttl: number } | null> {
  // This would integrate with your actual caching system
  // For now, return null to indicate no cache hit
  return null;
}

/**
 * Higher-order function to wrap API route handlers with cache metrics
 */
export function withCacheMonitoring<T extends any[], R>(
  handler: (...args: T) => R | Promise<R>,
  queryType: string,
  tags: string[] = []
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const cacheHit = false;
    const ttl = 0;

    try {
      // Execute the original handler
      const result = await handler(...args);

      // Record cache metrics
      const responseTime = Date.now() - startTime;
      await cachePerformanceMonitor.recordCacheMetrics(queryType, {
        cacheHit,
        responseTime,
        ttl,
        query: `function:${handler.name}`,
        tags
      });

      return result;

    } catch (error) {
      // Record error metrics
      const responseTime = Date.now() - startTime;
      await cachePerformanceMonitor.recordCacheMetrics(queryType, {
        cacheHit: false,
        responseTime,
        ttl: 0,
        query: `function:${handler.name}`,
        tags
      });

      throw error;
    }
  };
}

/**
 * Decorator for class methods to add cache monitoring
 */
export function CacheMonitored(queryType: string, tags: string[] = []) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const cacheHit = false;
      const ttl = 0;

      try {
        // Execute the original method
        const result = await originalMethod.apply(this, args);

        // Record cache metrics
        const responseTime = Date.now() - startTime;
        await cachePerformanceMonitor.recordCacheMetrics(queryType, {
          cacheHit,
          responseTime,
          ttl,
          query: `${target.constructor.name}.${propertyKey}`,
          tags
        });

        return result;

      } catch (error) {
        // Record error metrics
        const responseTime = Date.now() - startTime;
        await cachePerformanceMonitor.recordCacheMetrics(queryType, {
          cacheHit: false,
          responseTime,
          ttl: 0,
          query: `${target.constructor.name}.${propertyKey}`,
          tags
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Hook for React components to monitor cache performance
 */
export function useCacheMonitoring(queryType: string, tags: string[] = []) {
  const recordMetrics = async (metrics: Partial<CacheMetrics>) => {
    try {
      await cachePerformanceMonitor.recordCacheMetrics(queryType, {
        cacheHit: false,
        responseTime: 0,
        ttl: 0,
        query: `component:${queryType}`,
        tags,
        ...metrics
      });
    } catch (error) {
      console.error('Failed to record cache metrics:', error);
    }
  };

  return { recordMetrics };
}

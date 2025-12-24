// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager;
  private invalidationHooks: Map<string, Set<string>> = new Map();
  private invalidationTags: Map<string, string[]> = new Map();

  private constructor() {
    this.initializeDefaultHooks();
  }

  static getInstance(): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager();
    }
    return CacheInvalidationManager.instance;
  }

  private initializeDefaultHooks() {
    // Register default invalidation patterns
    this.registerInvalidation('vendor_specialties', [
      'search:vendor:*',
      'search:specialty:*',
      'cache:vendor:*',
      'cache:specialty:*'
    ]);

    this.registerInvalidation('vendor_services', [
      'search:service:*',
      'search:provider:*',
      'cache:service:*',
      'cache:provider:*'
    ]);

    this.registerInvalidation('vendor_locations', [
      'search:geo:*',
      'search:location:*',
      'cache:geo:*',
      'cache:location:*'
    ]);

    this.registerInvalidation('vendor_profiles', [
      'search:vendor:*',
      'search:provider:*',
      'cache:vendor:*',
      'cache:provider:*'
    ]);

    this.registerInvalidation('specialties', [
      'search:specialty:*',
      'cache:specialty:*',
      'specialty:tree:*'
    ]);

    this.registerInvalidation('reviews', [
      'search:rating:*',
      'cache:rating:*',
      'analytics:reviews:*'
    ]);

    this.registerInvalidation('bookings', [
      'analytics:bookings:*',
      'analytics:revenue:*',
      'cache:analytics:*'
    ]);
  }

  // Register cache keys to invalidate when data changes
  registerInvalidation(dataType: string, cacheKeys: string[]) {
    if (!this.invalidationHooks.has(dataType)) {
      this.invalidationHooks.set(dataType, new Set());
    }
    cacheKeys.forEach(key => this.invalidationHooks.get(dataType)!.add(key));
  }

  // Register invalidation tags for semantic invalidation
  registerInvalidationTags(cacheKey: string, tags: string[]) {
    this.invalidationTags.set(cacheKey, tags);
  }

  // Invalidate cache when data changes
  async invalidateCache(dataType: string, entityId?: string) {
    const keysToInvalidate = this.invalidationHooks.get(dataType) || new Set();
    
    for (const cacheKey of keysToInvalidate) {
      if (entityId && cacheKey.includes('*')) {
        // Replace wildcards with actual entity ID
        const specificKey = cacheKey.replace('*', entityId);
        await this.clearSpecificCache(specificKey);
      } else if (!entityId) {
        await this.clearSpecificCache(cacheKey);
      }
    }

    // Also invalidate by tags
    await this.invalidateByTags(dataType);
  }

  // Invalidate cache by semantic tags
  async invalidateByTags(tags: string | string[]) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    
    try {
      const { data, error } = await supabase.rpc('invalidate_cache_by_tags', {
        tags_to_invalidate: tagArray
      });

      if (error) {
        console.error('Cache invalidation by tags failed:', error);
        return 0;
      }

      console.log(`Cache invalidated by tags ${tagArray.join(', ')}: ${data} entries removed`);
      return data;
    } catch (error) {
      console.error('Cache invalidation by tags error:', error);
      return 0;
    }
  }

  // Clear specific cache entry
  private async clearSpecificCache(cacheKey: string) {
    try {
      const { error } = await supabase.rpc('clear_cached_query', { 
        cache_key: cacheKey 
      });

      if (error) {
        console.error(`Cache invalidation failed for ${cacheKey}:`, error);
      } else {
        console.log(`Cache invalidated: ${cacheKey}`);
      }
    } catch (error) {
      console.error(`Cache invalidation error for ${cacheKey}:`, error);
    }
  }

  // Bulk invalidate multiple cache keys
  async bulkInvalidate(cacheKeys: string[]) {
    const results = await Promise.allSettled(
      cacheKeys.map(key => this.clearSpecificCache(key))
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.length - successCount;

    console.log(`Bulk cache invalidation: ${successCount} successful, ${failureCount} failed`);
    
    return { successCount, failureCount };
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const { data: cacheData, error: cacheError } = await supabase
        .from('query_cache')
        .select('*', { count: 'exact', head: true });

      if (cacheError) {
        console.error('Failed to get cache stats:', cacheError);
        return null;
      }

      const { data: performanceData, error: perfError } = await supabase
        .from('performance_metrics')
        .select('cache_hit, response_time_ms')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (perfError) {
        console.error('Failed to get performance stats:', perfError);
        return null;
      }

      const totalRequests = performanceData?.length || 0;
      const cacheHits = performanceData?.filter(m => m.cache_hit).length || 0;
      const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

      return {
        totalCacheEntries: cacheData?.length || 0,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        totalRequests24h: totalRequests,
        cacheHits24h: cacheHits
      };
    } catch (error) {
      console.error('Failed to get cache statistics:', error);
      return null;
    }
  }

  // Clear all cache (use with caution)
  async clearAllCache() {
    try {
      const { data, error } = await supabase.rpc('clear_all_cache');
      
      if (error) {
        console.error('Failed to clear all cache:', error);
        return false;
      }

      console.log(`All cache cleared: ${data} entries removed`);
      return true;
    } catch (error) {
      console.error('Failed to clear all cache:', error);
      return false;
    }
  }

  // Warm up cache with common queries
  async warmUpCache() {
    const commonQueries = [
      { query: 'plumber', lat: 40.7128, lon: -74.0060, radius: 20 },
      { query: 'electrician', lat: 34.0522, lon: -118.2437, radius: 20 },
      { query: 'cleaning', lat: 41.8781, lon: -87.6298, radius: 20 },
      { query: 'landscaping', lat: 29.7604, lon: -95.3698, radius: 20 }
    ];

    console.log('Warming up cache with common queries...');

    for (const query of commonQueries) {
      try {
        const response = await fetch(`/api/search/providers/optimized?${new URLSearchParams({
          query: query.query,
          userLat: query.lat.toString(),
          userLon: query.lon.toString(),
          maxTravelDistance: query.radius.toString(),
          limit: '20'
        })}`);

        if (response.ok) {
          console.log(`Cache warmed for query: ${query.query}`);
        }
      } catch (error) {
        console.error(`Failed to warm cache for query ${query.query}:`, error);
      }
    }

    console.log('Cache warm-up completed');
  }
}

// Export singleton instance
export const cacheManager = CacheInvalidationManager.getInstance();

// Helper functions for common invalidation scenarios
export async function invalidateVendorCache(vendorId: string) {
  return cacheManager.invalidateCache('vendor_profiles', vendorId);
}

export async function invalidateSpecialtyCache(specialtyId: string) {
  return cacheManager.invalidateCache('specialties', specialtyId);
}

export async function invalidateLocationCache(locationId: string) {
  return cacheManager.invalidateCache('vendor_locations', locationId);
}

export async function invalidateServiceCache(serviceId: string) {
  return cacheManager.invalidateCache('vendor_services', serviceId);
}

export async function invalidateReviewCache(reviewId: string) {
  return cacheManager.invalidateCache('reviews', reviewId);
}

export async function invalidateAnalyticsCache() {
  return cacheManager.invalidateByTags(['analytics', 'cache']);
}

// Middleware for automatic cache invalidation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withCacheInvalidation<T extends (...args: any[]) => any>(
  handler: T,
  dataType: string
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (...args: any[]) => {
    const result = await handler(...args);
    
    // Invalidate related cache after successful operation
    try {
      await cacheManager.invalidateCache(dataType);
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      // Don't fail the main operation if cache invalidation fails
    }
    
    return result;
  }) as T;
}

// Enhanced cache invalidation worker for processing the queue
export async function processCacheInvalidationQueue() {
  try {
    const { data, error } = await supabase.rpc('drain_cache_invalidation_queue', {
      _batch_size: 500,
      _since_minutes: 60
    })
    
    if (error) {
      console.error('Failed to process cache invalidation queue:', error)
      return null
    }
    
    if (data) {
      console.log('Cache invalidation queue processed:', data)
      return data
    }
    
    return null
  } catch (error) {
    console.error('Cache invalidation queue processing failed:', error)
    return null
  }
}

// Function to clean up old queue entries
export async function cleanCacheInvalidationQueue(daysToKeep: number = 7) {
  try {
    const { data, error } = await supabase.rpc('clean_cache_invalidation_queue', {
      _days_to_keep: daysToKeep
    })
    
    if (error) {
      console.error('Failed to clean cache invalidation queue:', error)
      return null
    }
    
    console.log('Cache invalidation queue cleaned:', data, 'entries removed')
    return data
  } catch (error) {
    console.error('Cache invalidation queue cleanup failed:', error)
    return null
  }
}

// Enhanced cache invalidation with backpressure handling
export async function invalidateCacheWithBackpressure(
  tags: string[],
  maxRetries: number = 3,
  baseDelay: number = 1000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await cacheManager.invalidateByTags(tags)
      return true
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('Cache invalidation failed after all retries:', error)
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1) // Exponential backoff
      console.warn(`Cache invalidation attempt ${attempt} failed, retrying in ${delay}ms:`, error)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

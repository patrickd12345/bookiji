import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

// Top search queries to pre-warm
const TOP_SEARCH_QUERIES = [
  { lat: 40.7128, lng: -74.0060, radius: 25, specialty: 'massage' }, // NYC
  { lat: 34.0522, lng: -118.2437, radius: 25, specialty: 'massage' }, // LA
  { lat: 41.8781, lng: -87.6298, radius: 25, specialty: 'massage' }, // Chicago
  { lat: 29.7604, lng: -95.3698, radius: 25, specialty: 'massage' }, // Houston
  { lat: 33.7490, lng: -84.3880, radius: 25, specialty: 'massage' }, // Atlanta
]

export async function warmUpTopSearches() {
  const supabase = createSupabaseServerClient()
  
  console.log('🔥 Warming up top search queries...')
  
  for (const query of TOP_SEARCH_QUERIES) {
    try {
      const start = Date.now()
      
      // Call the search function to populate cache
      const { data, error } = await supabase.rpc('search_providers_optimized', {
        p_lat: query.lat,
        p_lng: query.lng,
        p_radius_meters: query.radius * 1000,
        p_specialty: query.specialty
      })
      
      const duration = Date.now() - start
      
      if (error) {
        console.warn(`⚠️ Cache warm failed for ${query.specialty} in ${query.lat},${query.lng}:`, error.message)
      } else {
        console.log(`✅ Warmed ${query.specialty} in ${query.lat},${query.lng} (${duration}ms, ${data?.length || 0} results)`)
      }
      
      // Small delay between queries to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (err) {
      console.error(`❌ Cache warm error for ${query.specialty}:`, err)
    }
  }
  
  console.log('🔥 Cache warming complete')
}

export async function refreshMaterializedViewsStaggered() {
  const supabase = createSupabaseServerClient()
  
  const materializedViews = [
    'performance_analytics_5min',
    'performance_analytics_hourly',
    'provider_analytics_daily',
    'specialty_analytics_daily',
    'geographic_analytics_daily',
    'api_metrics_5m',
    'api_metrics_hourly_enhanced'
  ]
  
  console.log('🔄 Starting staggered materialized view refresh...')
  
  for (let i = 0; i < materializedViews.length; i++) {
    const mv = materializedViews[i]
    const offsetMinutes = i * 2 // Stagger by 2 minutes
    
    try {
      console.log(`⏰ Scheduling refresh for ${mv} in ${offsetMinutes} minutes`)
      
      // Schedule the refresh with offset
      const { error } = await supabase.rpc('refresh_mv_concurrent', { mv_name: mv })
      
      if (error) {
        console.error(`❌ Failed to schedule refresh for ${mv}:`, error)
      } else {
        console.log(`✅ Scheduled refresh for ${mv}`)
      }
      
      // Wait before scheduling next one
      if (i < materializedViews.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 120000)) // 2 minutes
      }
      
    } catch (err) {
      console.error(`❌ Error scheduling refresh for ${mv}:`, err)
    }
  }
  
  console.log('🔄 Staggered refresh scheduling complete')
}

// Dead letter queue for failed cache invalidations
export async function processFailedInvalidations() {
  const supabase = createSupabaseServerClient()
  
  try {
    // Get failed invalidations from the queue
    const { data: failedInvalidations, error } = await supabase
      .from('cache_invalidation_queue')
      .select('*')
      .eq('processed_at', null)
      .gt('retry_count', 0)
      .order('enqueued_at', { ascending: true })
      .limit(100)
    
    if (error) {
      console.error('❌ Failed to fetch failed invalidations:', error)
      return
    }
    
    if (failedInvalidations.length === 0) {
      console.log('✅ No failed invalidations to process')
      return
    }
    
    console.log(`🔄 Processing ${failedInvalidations.length} failed invalidations...`)
    
    for (const invalidation of failedInvalidations) {
      try {
        // Retry the invalidation
        const { error: retryError } = await supabase.rpc('invalidate_cache_by_tags', {
          p_tags: [invalidation.tag]
        })
        
        if (retryError) {
          console.warn(`⚠️ Retry failed for tag ${invalidation.tag}:`, retryError.message)
          
          // Increment retry count
          await supabase
            .from('cache_invalidation_queue')
            .update({ 
              retry_count: invalidation.retry_count + 1,
              processed_at: new Date().toISOString()
            })
            .eq('id', invalidation.id)
          
        } else {
          console.log(`✅ Successfully retried invalidation for tag ${invalidation.tag}`)
          
          // Mark as processed
          await supabase
            .from('cache_invalidation_queue')
            .update({ 
              processed_at: new Date().toISOString(),
              retry_count: 0
            })
            .eq('id', invalidation.id)
        }
        
      } catch (err) {
        console.error(`❌ Error processing failed invalidation ${invalidation.id}:`, err)
      }
    }
    
    console.log('🔄 Failed invalidation processing complete')
    
  } catch (err) {
    console.error('❌ Error in failed invalidation processing:', err)
  }
}

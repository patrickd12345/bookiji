#!/usr/bin/env node

/**
 * Cron job script to refresh resilience metrics materialized views
 * Run this every hour to keep metrics up to date
 * 
 * Usage:
 * - Add to crontab: 0 * * * * /path/to/scripts/refresh-resilience-metrics.js
 * - Or run manually: node scripts/refresh-resilience-metrics.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function refreshResilienceMetrics() {
  console.log('🔄 Starting resilience metrics refresh...')
  
  try {
    // 1. Refresh materialized views
    console.log('📊 Refreshing materialized views...')
    const { error: refreshError } = await supabase.rpc('refresh_resilience_metrics_views')
    
    if (refreshError) {
      console.error('❌ Failed to refresh materialized views:', refreshError)
      return
    }
    
    console.log('✅ Materialized views refreshed successfully')
    
    // 2. Clean up old telemetry data (older than 30 days)
    console.log('🧹 Cleaning up old telemetry data...')
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { error: cleanupError } = await supabase
      .from('resilience_metrics')
      .delete()
      .lt('ts', thirtyDaysAgo.toISOString())
    
    if (cleanupError) {
      console.error('❌ Failed to cleanup old data:', cleanupError)
    } else {
      console.log('✅ Old telemetry data cleaned up')
    }
    
    // 3. Get current metrics for monitoring
    console.log('📈 Fetching current metrics...')
    const { data: metrics, error: metricsError } = await supabase.rpc('get_resilience_metrics')
    
    if (metricsError) {
      console.error('❌ Failed to fetch metrics:', metricsError)
      return
    }
    
    // 4. Log current health status
    console.log('📊 Current Resilience Health:')
    metrics.forEach(metric => {
      const status = metric.status === 'healthy' ? '✅' : 
                    metric.status === 'alert' ? '⚠️' : '❓'
      console.log(`  ${status} ${metric.metric_name}: ${metric.metric_value.toFixed(1)}% (${metric.status})`)
    })
    
    // 5. Check for critical alerts
    const criticalMetrics = metrics.filter(m => m.status === 'alert')
    if (criticalMetrics.length > 0) {
      console.log('🚨 CRITICAL ALERTS DETECTED:')
      criticalMetrics.forEach(metric => {
        console.log(`  ⚠️  ${metric.metric_name}: ${metric.metric_value.toFixed(1)}% (threshold: ${metric.threshold.toFixed(1)}%)`)
      })
    } else {
      console.log('✅ All metrics are healthy')
    }
    
    console.log('🎉 Resilience metrics refresh completed successfully')
    
  } catch (error) {
    console.error('💥 Unexpected error during refresh:', error)
    process.exit(1)
  }
}

// Run the refresh function
if (require.main === module) {
  refreshResilienceMetrics()
    .then(() => {
      console.log('🏁 Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

module.exports = { refreshResilienceMetrics }


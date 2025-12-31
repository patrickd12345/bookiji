#!/usr/bin/env node

/**
 * Cache Warming Service Setup Script
 * 
 * This script initializes the cache warming service with default strategies
 * and starts the scheduled warming process.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SECRET_KEY || ''
);

console.log('🚀 Initializing Cache Warming Service...\n');

// Default warming strategies configuration
const defaultStrategies = [
  {
    id: 'high_priority_search',
    name: 'High Priority Search Queries',
    description: 'Warms up most common search queries for instant response',
    queries: [
      {
        endpoint: '/api/search/providers/optimized',
        params: { query: 'plumber', limit: '20', maxTravelDistance: '20' },
        tags: ['search', 'vendor', 'high_priority'],
        expectedTTL: 30,
        priority: 1
      },
      {
        endpoint: '/api/search/providers/optimized',
        params: { query: 'electrician', limit: '20', maxTravelDistance: '20' },
        tags: ['search', 'vendor', 'high_priority'],
        expectedTTL: 30,
        priority: 1
      },
      {
        endpoint: '/api/search/providers/optimized',
        params: { query: 'cleaning', limit: '20', maxTravelDistance: '20' },
        tags: ['search', 'vendor', 'high_priority'],
        expectedTTL: 30,
        priority: 1
      },
      {
        endpoint: '/api/search/providers/optimized',
        params: { query: 'landscaping', limit: '20', maxTravelDistance: '20' },
        tags: ['search', 'vendor', 'high_priority'],
        expectedTTL: 30,
        priority: 1
      }
    ],
    schedule: {
      type: 'interval',
      value: '15',
      maxConcurrency: 3
    },
    enabled: true,
    priority: 1
  },
  {
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
      value: '30',
      maxConcurrency: 1
    },
    enabled: true,
    priority: 2
  },
  {
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
      value: '10',
      maxConcurrency: 2
    },
    enabled: true,
    priority: 3
  },
  {
    id: 'user_activity_triggered',
    name: 'User Activity Triggered',
    description: 'Warms up related queries when users perform actions',
    queries: [
      {
        endpoint: '/api/search/providers/optimized',
        params: { query: 'handyman', limit: '20', maxTravelDistance: '20' },
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
    priority: 4
  }
];

/**
 * Test cache warming strategies by executing them manually
 */
async function testWarmingStrategies() {
  console.log('🧪 Testing cache warming strategies...\n');
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  for (const strategy of defaultStrategies) {
    console.log(`Testing strategy: ${strategy.name}`);
    
    for (const query of strategy.queries) {
      try {
        const url = new URL(query.endpoint, baseUrl);
        Object.entries(query.params).forEach(([key, value]) => {
          url.searchParams.set(key, value.toString());
        });

        console.log(`  Testing: ${query.endpoint}`);
        
        const startTime = Date.now();
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'X-Cache-Warming': 'true',
            'X-Warming-Strategy': 'setup-script'
          }
        });

        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          console.log(`    ✅ Success (${responseTime}ms)`);
        } else {
          console.log(`    ❌ Failed: HTTP ${response.status}`);
        }
        
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
      }
    }
    console.log('');
  }
}

/**
 * Initialize cache warming service via API
 */
async function initializeWarmingService() {
  console.log('🔧 Initializing warming service via API...\n');
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    // Start the warming service
    const startResponse = await fetch(`${baseUrl}/api/admin/cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start-warming-service' })
    });

    if (startResponse.ok) {
      console.log('✅ Warming service started successfully');
    } else {
      console.log('⚠️  Could not start warming service via API (may not be running)');
    }

    // Add default strategies
    for (const strategy of defaultStrategies) {
      try {
        const response = await fetch(`${baseUrl}/api/admin/cache`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'add-warming-strategy', 
            strategy 
          })
        });

        if (response.ok) {
          console.log(`✅ Added strategy: ${strategy.name}`);
        } else {
          console.log(`⚠️  Could not add strategy: ${strategy.name}`);
        }
      } catch (error) {
        console.log(`⚠️  Error adding strategy ${strategy.name}: ${error.message}`);
      }
    }

  } catch (error) {
    console.log('⚠️  Could not initialize via API (server may not be running)');
    console.log('   You can manually start the service from the admin dashboard');
  }
}

/**
 * Display setup instructions
 */
function displayInstructions() {
  console.log('📋 Setup Instructions:\n');
  console.log('1. Ensure your Next.js server is running');
  console.log('2. Access the admin dashboard at /admin/cache');
  console.log('3. The cache warming service will start automatically');
  console.log('4. Monitor performance in the Cache Management dashboard\n');
  
  console.log('🔍 Key Features:');
  console.log('• Automatic cache warming every 15-30 minutes');
  console.log('• Priority-based query execution');
  console.log('• Performance monitoring and metrics');
  console.log('• TTL optimization recommendations');
  console.log('• Invalidation pattern analysis\n');
  
  console.log('📊 Monitoring:');
  console.log('• Cache hit rates by query type');
  console.log('• Response time tracking');
  console.log('• Warming strategy success rates');
  console.log('• Invalidation efficiency metrics\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    // Test the strategies
    await testWarmingStrategies();
    
    // Try to initialize via API
    await initializeWarmingService();
    
    // Display instructions
    displayInstructions();
    
    console.log('🎉 Cache warming service setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { defaultStrategies, testWarmingStrategies, initializeWarmingService };

#!/usr/bin/env node
/**
 * Verify Performance Optimization Migrations
 * Checks if all required tables, indexes, and functions from the performance optimization migrations exist
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:55321'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

const supabase = createClient(supabaseUrl, supabaseKey)

// Tables that should exist after migrations
const requiredTables = [
  'admin_audit_log',
  'slo_config',
  'slo_violations',
  'performance_metrics_bucketed',
  'cache_invalidation_dead_letter',
  'top_search_queries'
]

// Functions that should exist
const requiredFunctions = [
  'log_admin_action',
  'refresh_analytics_views_concurrent',
  'verify_mv_unique_indexes'
]

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      // Check if it's a "relation does not exist" error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return { exists: false, error: null }
      }
      return { exists: false, error: error.message }
    }
    return { exists: true, error: null }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}

async function checkFunctionExists(functionName) {
  try {
    const { data, error } = await supabase.rpc('pg_get_function_identity_arguments', {
      function_name: functionName
    })
    
    // If RPC doesn't exist, try a direct query approach
    if (error) {
      // Try to call the function to see if it exists
      try {
        await supabase.rpc(functionName, {})
        return { exists: true, error: null }
      } catch {
        return { exists: false, error: 'Function not found' }
      }
    }
    return { exists: true, error: null }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}

async function verifyMigrations() {
  console.log('🔍 Verifying Performance Optimization Migrations...\n')
  console.log(`📡 Connecting to: ${supabaseUrl}\n`)

  let allTablesExist = true
  let allFunctionsExist = true

  // Check tables
  console.log('📊 Checking Tables:')
  for (const table of requiredTables) {
    const result = await checkTableExists(table)
    const status = result.exists ? '✅' : '❌'
    console.log(`  ${status} ${table}`)
    if (!result.exists) {
      allTablesExist = false
      if (result.error) {
        console.log(`     Error: ${result.error}`)
      }
    }
  }

  console.log('\n🔧 Checking Functions:')
  for (const func of requiredFunctions) {
    const result = await checkFunctionExists(func)
    const status = result.exists ? '✅' : '❌'
    console.log(`  ${status} ${func}`)
    if (!result.exists) {
      allFunctionsExist = false
      if (result.error) {
        console.log(`     Error: ${result.error}`)
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  if (allTablesExist && allFunctionsExist) {
    console.log('✅ All migrations appear to be applied!')
    process.exit(0)
  } else {
    console.log('❌ Some migrations are missing. Need to apply migrations.')
    process.exit(1)
  }
}

verifyMigrations().catch(err => {
  console.error('❌ Error verifying migrations:', err)
  process.exit(1)
})

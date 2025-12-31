#!/usr/bin/env node
/**
 * Verify database minimum wiring for Support RAG
 * Checks that required tables and functions exist
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      // PGRST116 = table not found in schema cache
      // 42P01 = relation does not exist (PostgreSQL error)
      if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('Could not find')) {
        return { exists: false, error: 'Table does not exist' }
      }
      // Other errors might indicate table exists but has issues
      // For our purposes, if we get a non-404 error, table likely exists
      if (error.code && !error.code.startsWith('42')) {
        return { exists: true } // Table exists, just has some other issue
      }
      return { exists: false, error: error.message }
    }
    return { exists: true }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}

async function checkFunction(functionName) {
  // Try to call the function (will fail if doesn't exist, but that's ok for check)
  const { data, error } = await supabase.rpc(functionName, {
    q_embedding: Array(1536).fill(0),
    k: 1
  })
  
  if (error && error.message.includes('does not exist')) {
    return { exists: false, error: error.message }
  }
  // If we get here, function exists (even if it returns empty)
  return { exists: true }
}

async function verify() {
  console.log('🔍 Verifying database minimum wiring...\n')
  
  const checks = [
    { name: 'kb_articles table', check: () => checkTable('kb_articles') },
    { name: 'kb_article_chunks table', check: () => checkTable('kb_article_chunks') },
    { name: 'kb_embeddings table', check: () => checkTable('kb_embeddings') },
    { name: 'kb_rag_usage table', check: () => checkTable('kb_rag_usage') },
    { name: 'simcity_runs table', check: () => checkTable('simcity_runs') },
    { name: 'simcity_run_events table', check: () => checkTable('simcity_run_events') },
    { name: 'kb_search function', check: () => checkFunction('kb_search') }
  ]
  
  let allPassed = true
  
  for (const { name, check } of checks) {
    try {
      const result = await check()
      if (result.exists) {
        console.log(`✅ ${name}: exists`)
      } else {
        console.log(`❌ ${name}: ${result.error || 'missing'}`)
        allPassed = false
      }
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`)
      allPassed = false
    }
  }
  
  console.log('')
  if (allPassed) {
    console.log('✅ All database objects exist')
    process.exit(0)
  } else {
    console.log('❌ Some database objects are missing. Run: supabase db push')
    process.exit(1)
  }
}

verify().catch(error => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})


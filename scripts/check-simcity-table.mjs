#!/usr/bin/env node
/**
 * Direct SQL check for simcity_run_events table
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function check() {
  // Use RPC to check if table exists
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'simcity_run_events');"
  }).catch(async () => {
    // Fallback: try to query the table directly
    const { data, error } = await supabase
      .from('simcity_run_events')
      .select('id')
      .limit(1)
    return { data, error }
  })
  
  if (error) {
    if (error.message.includes('does not exist') || error.code === 'PGRST116') {
      console.log('❌ simcity_run_events table does not exist')
      console.log('   Run: supabase db push (phase3 migration)')
      return false
    }
    console.log('⚠️  Check result:', error.message)
    return false
  }
  
  console.log('✅ simcity_run_events table exists')
  return true
}

check().then(exists => {
  process.exit(exists ? 0 : 1)
}).catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})




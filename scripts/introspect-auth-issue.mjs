#!/usr/bin/env node
/**
 * Introspection script to identify database-level auth issues
 * Runs queries to find triggers, functions, views, and RLS policies
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Load .env.local
const envFile = join(rootDir, '.env.local')
const envContent = readFileSync(envFile, 'utf-8')

let supabaseUrl = null
let supabaseServiceKey = null

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim()
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = line.split('=')[1].trim()
  }
})

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runQuery(query, description) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`Query: ${description}`)
  console.log('='.repeat(80))
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: query })
    
    if (error) {
      // Try direct query if RPC doesn't exist
      const { data: directData, error: directError } = await supabase
        .from('_dummy')
        .select('*')
        .limit(0)
      
      // Use raw SQL via PostgREST if available, otherwise show error
      console.error(`Error running query: ${error.message}`)
      console.log('\nNote: This query needs to be run directly in the database.')
      console.log('Please run it in Supabase Dashboard SQL Editor or via psql.')
      console.log('\nQuery:')
      console.log(query)
      return null
    }
    
    if (data && data.length > 0) {
      console.table(data)
      return data
    } else {
      console.log('No results found.')
      return []
    }
  } catch (err) {
    console.error(`Exception: ${err.message}`)
    console.log('\nPlease run this query directly in Supabase Dashboard SQL Editor:')
    console.log(query)
    return null
  }
}

async function main() {
  console.log('🔍 Introspecting database for auth-related issues...\n')
  
  // Query 1: List triggers on auth.users
  const query1 = `
    select
      tg.tgname as trigger_name,
      n.nspname as schema_name,
      c.relname as table_name,
      p.proname as function_name,
      pg_get_triggerdef(tg.oid, true) as trigger_def
    from pg_trigger tg
    join pg_class c on c.oid = tg.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = tg.tgfoid
    where n.nspname = 'auth'
      and c.relname = 'users'
      and not tg.tgisinternal
    order by tg.tgname;
  `
  
  // Query 2: Find profile-related functions
  const query2 = `
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where pg_get_functiondef(p.oid) ilike '%profiles%'
       or pg_get_functiondef(p.oid) ilike '%user_role_summary%'
       or pg_get_functiondef(p.oid) ilike '%auth.users%'
    order by n.nspname, p.proname;
  `
  
  // Query 3: Check user_role_summary view
  const query3 = `
    select
      schemaname,
      viewname,
      definition
    from pg_views
    where viewname = 'user_role_summary';
  `
  
  // Query 4: Check RLS policies on profiles
  const query4 = `
    select
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    from pg_policies
    where tablename = 'profiles';
  `
  
  await runQuery(query1, 'Triggers on auth.users')
  await runQuery(query2, 'Profile-related functions')
  await runQuery(query3, 'user_role_summary view definition')
  await runQuery(query4, 'RLS policies on profiles table')
  
  console.log('\n' + '='.repeat(80))
  console.log('✅ Introspection complete')
  console.log('='.repeat(80))
  console.log('\nIf queries failed, please run them directly in Supabase Dashboard SQL Editor.')
}

main().catch(console.error)


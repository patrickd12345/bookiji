#!/usr/bin/env node
/**
 * Read-only database introspection
 * Runs queries to identify the failing database object
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
  if (line.startsWith('SUPABASE_SECRET_KEY=')) {
    supabaseServiceKey = line.split('=')[1].trim()
  }
})

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runQuery(query, description) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`${description}`)
  console.log('='.repeat(80))
  
  try {
    // Use RPC to execute raw SQL (requires a function, but we'll try direct query first)
    // Actually, we need to use the PostgREST API or create a function
    // For now, output the query for manual execution
    console.log('\nQuery:')
    console.log(query)
    console.log('\n⚠️  This query needs to be run directly in Supabase Dashboard SQL Editor')
    console.log('   or via psql connection to the database.')
    console.log('\n   The Supabase JS client cannot execute system catalog queries.')
    
    return null
  } catch (err) {
    console.error(`Exception: ${err.message}`)
    return null
  }
}

async function main() {
  console.log('🔍 READ-ONLY DATABASE INTROSPECTION')
  console.log('='.repeat(80))
  console.log('\nThese queries must be run in Supabase Dashboard SQL Editor')
  console.log('or via direct psql connection to the database.\n')
  
  const query1 = `
select
  tg.tgname,
  n.nspname,
  c.relname,
  p.proname,
  pg_get_triggerdef(tg.oid, true)
from pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = tg.tgfoid
where n.nspname = 'auth'
  and c.relname = 'users'
  and not tg.tgisinternal;
`
  
  const query2 = `
select
  n.nspname,
  p.proname,
  pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where pg_get_functiondef(p.oid) ilike '%profiles%'
   or pg_get_functiondef(p.oid) ilike '%role%'
   or pg_get_functiondef(p.oid) ilike '%auth.uid%';
`
  
  const query3 = `
select schemaname, policyname, cmd, qual
from pg_policies
where tablename = 'profiles';
`
  
  await runQuery(query1, 'Query 1: Triggers on auth.users')
  await runQuery(query2, 'Query 2: Functions referencing profiles/roles')
  await runQuery(query3, 'Query 3: RLS policies on profiles')
  
  console.log('\n' + '='.repeat(80))
  console.log('NEXT STEPS:')
  console.log('1. Copy each query above')
  console.log('2. Run in Supabase Dashboard → SQL Editor')
  console.log('3. Share the results (especially triggers and functions)')
  console.log('='.repeat(80))
}

main().catch(console.error)


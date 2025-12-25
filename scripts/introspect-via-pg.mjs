#!/usr/bin/env node
/**
 * Read-only database introspection via direct PostgreSQL connection
 */

import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Load .env.local
const envFile = join(rootDir, '.env.local')
const envContent = readFileSync(envFile, 'utf-8')

let databaseUrl = null

envContent.split('\n').forEach(line => {
  if (line.startsWith('DATABASE_URL=')) {
    databaseUrl = line.split('=')[1].trim()
  }
})

if (!databaseUrl) {
  console.error('Missing DATABASE_URL in .env.local')
  process.exit(1)
}

const client = new pg.Client({ connectionString: databaseUrl })

async function runQuery(query, description) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`${description}`)
  console.log('='.repeat(80))
  
  try {
    const result = await client.query(query)
    
    if (result.rows.length === 0) {
      console.log('✅ No results found (this is expected if no triggers/functions exist)')
      return []
    }
    
    console.log(`\nFound ${result.rows.length} result(s):\n`)
      result.rows.forEach((row, idx) => {
      console.log(`--- Result ${idx + 1} ---`)
      Object.entries(row).forEach(([key, value]) => {
        if (key === 'definition' && typeof value === 'string') {
          // Show full definition for functions
          console.log(`${key}:`)
          console.log(value)
        } else if (typeof value === 'string' && value.length > 200) {
          console.log(`${key}: ${value.substring(0, 200)}... (truncated)`)
        } else {
          console.log(`${key}: ${value}`)
        }
      })
      console.log('')
    })
    
    return result.rows
  } catch (err) {
    console.error(`❌ Error: ${err.message}`)
    return null
  }
}

async function main() {
  console.log('🔍 READ-ONLY DATABASE INTROSPECTION')
  console.log('='.repeat(80))
  
  try {
    await client.connect()
    console.log('✅ Connected to database\n')
    
    // Query 1: Triggers on auth.users
    const triggers = await runQuery(`
      select
        tg.tgname,
        n.nspname,
        c.relname,
        p.proname,
        pg_get_triggerdef(tg.oid, true) as trigger_def
      from pg_trigger tg
      join pg_class c on c.oid = tg.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_proc p on p.oid = tg.tgfoid
      where n.nspname = 'auth'
        and c.relname = 'users'
        and not tg.tgisinternal;
    `, 'Query 1: Triggers on auth.users')
    
    // Query 2: Functions referencing profiles/roles
    // Note: We'll check function names and then get definitions for matches
    const functions = await runQuery(`
      select
        n.nspname,
        p.proname,
        pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where p.proname ilike '%profile%'
         or p.proname ilike '%role%'
         or p.proname ilike '%user%'
      order by n.nspname, p.proname
      limit 20;
    `, 'Query 2: Functions with profile/role/user in name')
    
    // Query 2b: Check if user_role_summary view exists
    const viewCheck = await runQuery(`
      select
        schemaname,
        viewname,
        definition
      from pg_views
      where viewname = 'user_role_summary';
    `, 'Query 2b: Check user_role_summary view')
    
    // Query 2c: Get full definition of calculate_profile_completion_score
    const profileFunction = await runQuery(`
      select
        p.proname,
        n.nspname,
        pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where p.proname = 'calculate_profile_completion_score'
        and n.nspname = 'public';
    `, 'Query 2c: Full definition of calculate_profile_completion_score')
    
    // Query 2d: Check for views/functions that reference user_role_summary or broken column refs
    const brokenRefs = await runQuery(`
      select
        schemaname,
        viewname,
        definition
      from pg_views
      where definition ilike '%user_role_summary%'
         or definition ilike '%profiles.id%'
         or (definition ilike '%profiles%' and definition ilike '%.id%')
      limit 10;
    `, 'Query 2d: Views with potentially broken references')
    
    // Query 3: RLS policies on profiles
    const policies = await runQuery(`
      select schemaname, policyname, cmd, qual, with_check
      from pg_policies
      where tablename = 'profiles';
    `, 'Query 3: RLS policies on profiles')
    
    console.log('\n' + '='.repeat(80))
    console.log('INTROSPECTION COMPLETE')
    console.log('='.repeat(80))
    
    // Summary
    console.log('\nSummary:')
    console.log(`  - Triggers on auth.users: ${triggers?.length || 0}`)
    console.log(`  - Functions referencing profiles/roles: ${functions?.length || 0}`)
    console.log(`  - RLS policies on profiles: ${policies?.length || 0}`)
    
  } catch (err) {
    console.error('❌ Connection error:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(console.error)


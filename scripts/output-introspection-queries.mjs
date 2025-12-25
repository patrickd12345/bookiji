#!/usr/bin/env node
/**
 * Output introspection queries for manual execution in Supabase Dashboard SQL Editor
 */

const queries = {
  triggers: `
-- Query 1: List triggers on auth.users
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
`,

  functions: `
-- Query 2: Find profile-related functions
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
`,

  view: `
-- Query 3: Check user_role_summary view (if it exists)
select
  schemaname,
  viewname,
  definition
from pg_views
where viewname = 'user_role_summary';
`,

  rls: `
-- Query 4: Check RLS policies on profiles
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
}

console.log('='.repeat(80))
console.log('INTROSPECTION QUERIES - Run these in Supabase Dashboard SQL Editor')
console.log('='.repeat(80))
console.log('')

Object.entries(queries).forEach(([name, query]) => {
  console.log(`\n${'─'.repeat(80)}`)
  console.log(`${name.toUpperCase()}`)
  console.log('─'.repeat(80))
  console.log(query)
})

console.log('\n' + '='.repeat(80))
console.log('Copy and paste each query into Supabase Dashboard SQL Editor')
console.log('Share the results, especially:')
console.log('  - Any triggers on auth.users')
console.log('  - Any functions that reference profiles or user_role_summary')
console.log('='.repeat(80))


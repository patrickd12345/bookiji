-- Introspection queries to identify database-level auth issues
-- Run these in Supabase Dashboard SQL Editor

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

-- Query 2: Find profile-related functions called by triggers
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

-- Query 3: Locate user_role_summary view definition (if it exists)
select
  schemaname,
  viewname,
  definition
from pg_views
where viewname = 'user_role_summary';

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


-- Fix Supabase Auth (GoTrue) crash: scanning NULL confirmation_token into string
-- Root cause: auth.users.confirmation_token contains NULL but GoTrue expects non-null string.
-- Minimal fix:
-- 1) Normalize existing NULLs to empty string
-- 2) Enforce NOT NULL with DEFAULT '' to prevent regression

UPDATE auth.users
SET confirmation_token = ''
WHERE confirmation_token IS NULL;

ALTER TABLE auth.users
  ALTER COLUMN confirmation_token SET DEFAULT '',
  ALTER COLUMN confirmation_token SET NOT NULL;



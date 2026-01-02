# Production Log Investigation Report

**Date:** January 2, 2026
**Status:** 🔴 **UNHEALTHY** - Critical Configuration Issue Identified

## Executive Summary

The "Unregistered API key" error in production is caused by a **mismatch between the Supabase URL and the API Key** in the Vercel Production environment.

The application is falling back to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (likely the Staging/Preview key) while trying to access the Production Database URL (or vice-versa).

## Root Cause Analysis

1.  **Code Logic:** `src/lib/env/supabaseEnv.ts` prefers `PROD_SUPABASE_*` keys in production, but falls back to `NEXT_PUBLIC_SUPABASE_*` if they are missing.
2.  **Configuration Gap:** The Vercel Production environment is missing the explicit `PROD_SUPABASE_PUBLISHABLE_KEY` variable, causing it to use the baked-in Staging key.
3.  **Result:** The Supabase client sends a Staging JWT to the Production URL, which rejects it as "Unregistered".

## Fix Implementation

### 1. Code Update (Applied)
Updated `src/lib/env/supabaseEnv.ts` to log a specific warning when `PROD_SUPABASE_PUBLISHABLE_KEY` is missing in the production environment. This ensures future debugging points directly to this configuration gap.

### 2. Resolution Script (Created)
Created `scripts/fix-production-keys.mjs` to automate the fix.

## Required Actions

Please run the following command in your terminal to fix the production keys:

```bash
node scripts/fix-production-keys.mjs
```

You will need:
1.  **Production Supabase URL**
2.  **Production Supabase Anon Key**
3.  **Production Supabase Service Role Key** (Optional but recommended)

This script will update the Vercel environment variables and trigger a redeployment.

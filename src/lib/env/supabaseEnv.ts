/**
 * Supabase Environment Configuration
 * 
 * Centralized, authoritative source for Supabase credentials by environment.
 * 
 * This module enforces the environment isolation invariant:
 * - local: Supabase Local (supabase start)
 * - staging: Separate Supabase Cloud Project
 * - prod: Separate Supabase Cloud Project
 * 
 * No code should access Supabase env vars directly.
 * All Supabase clients must use this module.
 */

import { assertAppEnv } from './assertAppEnv';

export interface SupabaseEnvConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
}

/**
 * Get Supabase configuration for the current environment.
 * 
 * This function:
 * 1. Asserts APP_ENV is valid (throws if not)
 * 2. Returns environment-specific Supabase credentials
 * 3. Validates that required keys are present
 * 
 * Environment mapping:
 * - local: Uses Supabase Local (http://localhost:54321)
 * - staging: Uses STAGING_SUPABASE_* env vars
 * - prod: Uses PROD_SUPABASE_* env vars
 * 
 * @returns Supabase configuration for current environment
 * @throws Error if APP_ENV is invalid or required credentials are missing
 */
export function getSupabaseEnv(): SupabaseEnvConfig {
  const env = assertAppEnv();

  if (env === 'local') {
    // Supabase Local - standard demo keys
    return {
      url: process.env.LOCAL_SUPABASE_URL || 'http://localhost:54321',
      anonKey: process.env.LOCAL_SUPABASE_ANON_KEY || 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      serviceKey: process.env.LOCAL_SUPABASE_SERVICE_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
    };
  }

  if (env === 'staging') {
    const url = process.env.STAGING_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.STAGING_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey) {
      throw new Error(
        'Missing staging Supabase credentials. ' +
        'Required: STAGING_SUPABASE_URL and STAGING_SUPABASE_ANON_KEY'
      );
    }

    return {
      url,
      anonKey,
      serviceKey,
    };
  }

  if (env === 'prod') {
    const url = process.env.PROD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.PROD_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.PROD_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey) {
      throw new Error(
        'Missing production Supabase credentials. ' +
        'Required: PROD_SUPABASE_URL and PROD_SUPABASE_ANON_KEY'
      );
    }

    return {
      url,
      anonKey,
      serviceKey,
    };
  }

  // This should never happen due to assertAppEnv, but TypeScript needs it
  throw new Error(`Unreachable: invalid environment ${env}`);
}

/**
 * Get Supabase URL for the current environment.
 * 
 * @returns Supabase URL
 */
export function getSupabaseUrl(): string {
  return getSupabaseEnv().url;
}

/**
 * Get Supabase anon key for the current environment.
 * 
 * @returns Supabase anon key
 */
export function getSupabaseAnonKey(): string {
  return getSupabaseEnv().anonKey;
}

/**
 * Get Supabase service role key for the current environment.
 * 
 * @returns Supabase service role key, or undefined if not available
 * @throws Error if service key is required but missing
 */
export function getSupabaseServiceKey(): string {
  const config = getSupabaseEnv();
  if (!config.serviceKey) {
    throw new Error('Supabase service key is required but not available');
  }
  return config.serviceKey;
}


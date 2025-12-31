/**
 * Supabase Configuration with Migration Support
 * 
 * This file provides a centralized way to manage Supabase configuration
 * and supports migration from the old key model to the new one.
 * 
 * NOTE: New code should use @/lib/env/supabaseEnv instead.
 * This file is maintained for backward compatibility.
 */

// Import createClient for type reference if needed
// import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '@/lib/env/supabaseEnv';

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  secretKey?: string;
}

/**
 * Get Supabase configuration with backward compatibility
 * 
 * NOTE: Prefer using getSupabaseEnv() from @/lib/env/supabaseEnv for new code.
 * This function maintains backward compatibility but delegates to the
 * environment-aware configuration system.
 */
export function getSupabaseConfig(): SupabaseConfig {
  // Try to use environment-aware config first
  try {
    const envConfig = getSupabaseEnv();
    return {
      url: envConfig.url,
      publishableKey: envConfig.anonKey,
      secretKey: envConfig.serviceKey,
    };
  } catch {
    // Fallback to legacy behavior for backward compatibility
  }

  // Legacy fallback (maintained for backward compatibility)
  // For tests, provide a stable default to avoid env failures
  if (process.env.NODE_ENV === 'test') {
    return {
      url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co',
      publishableKey:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        'test-publishable-key',
      secretKey:
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        'test-secret-key'
    };
  }

  // For local development, force local database connection if requested
  if (process.env.NODE_ENV === 'development' && process.env.FORCE_LOCAL_DB === 'true') {
    return {
      url: 'http://127.0.0.1:55321',
      publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    };
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  // New key model (preferred):
  // - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_...)
  // - SUPABASE_SECRET_KEY (sb_secret_...)
  //
  // Legacy fallback:
  // - NEXT_PUBLIC_SUPABASE_ANON_KEY (eyJ...)
  // - SUPABASE_SERVICE_ROLE_KEY (eyJ...)
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    undefined;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    undefined;

  if (!url || !publishableKey) {
    const hints: string[] = [];
    if (!url) hints.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!publishableKey) hints.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    const hint = hints.length ? ` Missing: ${hints.join(', ')}.` : '';
    throw new Error(
      `Supabase authentication misconfigured.${hint} ` +
        'Set env vars NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart/redeploy.'
    );
  }

  return { url, secretKey, publishableKey };
}

/**
 * Check if the new key model is being used
 */
export function isUsingNewKeyModel(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_SECRET_KEY
  );
}

/**
 * Get environment variable names for migration guidance
 */
export function getEnvironmentVariableNames() {
  return {
    current: {
      url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL' : 'MISSING',
      publishableKey:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY legacy)'
          : 'MISSING',
      secretKey:
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY
          ? 'SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY legacy)'
          : 'MISSING'
    },
    recommended: {
      url: 'SUPABASE_URL',
      publishableKey: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      secretKey: 'SUPABASE_SECRET_KEY'
    }
  };
}

/**
 * Validate that all required environment variables are present
 */
export function validateSupabaseConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getSupabaseConfig();

  if (!config.url) {
    errors.push('Missing Supabase URL');
  }

  if (!config.publishableKey) {
    errors.push('Missing Supabase publishable key');
  }

  if (!config.secretKey) {
    errors.push('Missing Supabase secret key (required for server-side operations)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

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
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-publishable-key',
      secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-secret-key'
    };
  }

  // For local development, force local database connection if requested
  if (process.env.NODE_ENV === 'development' && process.env.FORCE_LOCAL_DB === 'true') {
    return {
      url: 'http://127.0.0.1:54321',
      publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    };
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer JWT format (SUPABASE_SERVICE_ROLE_KEY) over CLI format (SUPABASE_SECRET_KEY)
  // The JS client requires JWT format (starts with eyJ...), not CLI format (sb_secret__...)
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Validate key format for JS client (must be JWT, not CLI format)
  if (secretKey && !secretKey.startsWith('eyJ') && secretKey.startsWith('sb_secret__')) {
    console.warn('⚠️ SUPABASE_SECRET_KEY appears to be CLI format (sb_secret__...). The JS client requires JWT format (eyJ...). Use SUPABASE_SERVICE_ROLE_KEY instead.');
  }

  if (!url || !publishableKey) {
    console.warn('⚠️ Missing Supabase environment variables, using fallback configuration');
    return {
      url: 'https://dummy.supabase.co',
      publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      secretKey: secretKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    };
  }

  return { url, secretKey, publishableKey };
}

/**
 * Check if the new key model is being used
 */
export function isUsingNewKeyModel(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

/**
 * Get environment variable names for migration guidance
 */
export function getEnvironmentVariableNames() {
  return {
    current: {
      url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL' : 'MISSING',
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY' : 'MISSING',
      secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY' : 'MISSING'
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

/**
 * Supabase Configuration with Migration Support
 * 
 * This file provides a centralized way to manage Supabase configuration
 * and supports migration from the old key model to the new one.
 */

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  secretKey?: string;
}

/**
 * Get Supabase configuration with backward compatibility
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing Supabase URL environment variable');
  }

  if (!publishableKey) {
    throw new Error('Missing Supabase publishable key environment variable');
  }

  return {
    url,
    publishableKey,
    secretKey
  };
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

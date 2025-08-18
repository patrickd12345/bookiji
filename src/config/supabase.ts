/**
 * Supabase Configuration with Migration Support
 * 
 * This file provides a centralized way to manage Supabase configuration
 * and supports migration from the old key model to the new one.
 */

// Core Supabase configuration
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  secretKey?: string;
  publishableKey?: string;
}

// Environment-based configuration
export function getSupabaseConfig(): SupabaseConfig {
  // Default configuration for client-side usage
  const config: SupabaseConfig = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://localhost:54321',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
  };

  // Add service role key only if available (for server-side operations)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    config.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  // Add secret key for backward compatibility
  if (process.env.SUPABASE_SECRET_KEY) {
    config.secretKey = process.env.SUPABASE_SECRET_KEY;
  }

  // Add publishable key for backward compatibility
  if (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    config.publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }

  return config;
}

// Get a client instance (imported dynamically to avoid bundling issues)
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Utility to get anon key without exposing other keys
export function getAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// For debugging configuration (obfuscated to avoid leaking keys)
export function debugConfiguration(): Record<string, string | boolean> {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NEXT_PUBLIC_SUPABASE_URL missing',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY set' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY missing',
    serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    configured: isSupabaseConfigured(),
  };
}

// Create a Supabase client (for use in components or hooks)
export function getSupabaseClient() {
  const config = getSupabaseConfig();
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

// Create a Supabase client with service role (for server-side operations)
export function getSupabaseServiceClient() {
  const config = getSupabaseConfig();
  if (!config.serviceRoleKey) {
    throw new Error('Service role key required for this operation');
  }
  return createClient<Database>(config.url, config.serviceRoleKey);
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

  if (!config.anonKey) {
    errors.push('Missing Supabase anon key');
  }

  if (!config.serviceRoleKey) {
    errors.push('Missing Supabase service role key (required for server-side operations)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

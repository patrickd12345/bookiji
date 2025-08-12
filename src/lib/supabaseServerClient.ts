import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';

/**
 * Server-side Supabase client using the secret key for admin operations
 * This should NEVER be exposed to the client/browser
 */
export const createSupabaseServerClient = () => {
  const config = getSupabaseConfig();
  
  if (!config.secretKey) {
    throw new Error('Missing Supabase secret key environment variable');
  }

  return createClient(config.url, config.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * Get the Supabase URL from environment variables
 */
export const getSupabaseUrl = () => {
  const config = getSupabaseConfig();
  return config.url;
};

/**
 * Get the appropriate Supabase key based on context
 * @param isServer - Whether this is running on the server
 * @param requireSecret - Whether the secret key is required
 */
export const getSupabaseKey = (isServer: boolean = false, requireSecret: boolean = false) => {
  const config = getSupabaseConfig();
  
  if (requireSecret || isServer) {
    return config.secretKey;
  }
  
  return config.publishableKey;
};

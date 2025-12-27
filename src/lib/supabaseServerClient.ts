import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey, getSupabaseAnonKey } from '@/lib/env/supabaseEnv';
import { buildSyntheticAwareFetch, detectSyntheticContext } from '@/lib/simcity/syntheticContext';

/**
 * Server-side Supabase client using the secret key for admin operations
 * This should NEVER be exposed to the client/browser
 */
export const createSupabaseServerClient = () => {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();

  if (!serviceKey) {
    throw new Error('Missing Supabase secret key environment variable');
  }

  const syntheticContext = detectSyntheticContext();
  const syntheticFetch = buildSyntheticAwareFetch(syntheticContext);

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: syntheticFetch ? { fetch: syntheticFetch } : undefined,
  });
};

/**
 * Get Supabase server client that authenticates as the current user
 * This is used for operations that need user context (like requireAdmin)
 */
export const getSupabaseServerClient = () => {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!anonKey) {
    throw new Error('Missing Supabase publishable key environment variable');
  }

  const syntheticContext = detectSyntheticContext();
  const syntheticFetch = buildSyntheticAwareFetch(syntheticContext);

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: syntheticFetch ? { fetch: syntheticFetch } : undefined,
  });
};

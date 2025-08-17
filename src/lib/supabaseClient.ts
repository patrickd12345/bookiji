import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';

// Create a function to get the Supabase client
// This prevents the config from being evaluated at module load time
export function getSupabaseClient(): SupabaseClient {
  try {
    const config = getSupabaseConfig();
    return createClient(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    // Return a dummy client that will fail gracefully
    return createClient('https://dummy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0');
  }
}

// Export a default client instance (for backward compatibility)
// This will be created when first accessed
let _supabase: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!_supabase) {
      _supabase = getSupabaseClient();
    }
    return _supabase![prop as keyof SupabaseClient];
  }
});

// Export function to create new client instances (for server-side use)
export const createSupabaseClient = (): SupabaseClient => {
  return getSupabaseClient();
}; 
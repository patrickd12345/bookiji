import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';

// Get configuration with backward compatibility
const config = getSupabaseConfig();

// Create Supabase client
export const supabase = createClient(config.url, config.publishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Export function to create new client instances (for server-side use)
export const createSupabaseClient = () => {
  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}; 
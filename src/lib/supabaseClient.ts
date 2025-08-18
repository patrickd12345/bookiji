import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) throw new Error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in env');

let client: SupabaseClient<Database>;

function makeClient(key: string) {
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 2 } },
  });
}

// --- bootstrap: prefer publishable, fallback to anon ---
if (pubKey) {
  console.info('✅ Initializing with publishable key');
  client = makeClient(pubKey);
} else if (anonKey) {
  console.info('✅ Initializing with anon key (no publishable key found)');
  client = makeClient(anonKey);
} else {
  throw new Error('❌ Missing both publishable and anon keys in env');
}

// --- probe auth to auto-switch if publishable isn’t ready ---
async function probeAndFix() {
  try {
    await client.auth.getSession();
    console.info('✅ Auth probe successful with current key');
  } catch {
    console.warn('⚠️ Publishable key not accepted for auth — switching to anon');
    if (anonKey) {
      client = makeClient(anonKey);
      console.info('✅ Switched to anon key');
    } else {
      throw new Error('❌ No anon key available to fallback');
    }
  }
}

// Run probe once on load
probeAndFix();

export function getSupabaseClient() {
  return client;
}

// Backward compatibility exports
export const supabase = client;

export function createSupabaseClient() {
  return client;
} 
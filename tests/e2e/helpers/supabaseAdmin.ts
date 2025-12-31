import { createSupabaseAdminClient } from '../../../scripts/e2e/createSupabaseAdmin'

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('Missing SUPABASE_URL (expected local)')
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY for backward compatibility)')

  // Use the utility with timeout and IPv4 handling to prevent UND_ERR_HEADERS_TIMEOUT
  return createSupabaseAdminClient(url, key, {
    timeoutMs: 60000, // 60 second timeout for admin operations
    forceIPv4: true   // Force IPv4 to avoid IPv6 resolution issues on Windows
  })
}


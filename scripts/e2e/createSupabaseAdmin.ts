/**
 * Utility for creating Supabase admin clients with proper timeout and IPv4 handling.
 * 
 * Fixes UND_ERR_HEADERS_TIMEOUT issues by:
 * 1. Forcing IPv4 (replacing localhost with 127.0.0.1) to avoid IPv6 resolution hangs
 * 2. Setting explicit 60-second timeout for admin operations
 * 3. Providing clear error diagnostics for connection failures
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Normalize Supabase URL to force IPv4 for localhost connections.
 * This prevents IPv6 resolution issues on Windows where localhost -> ::1
 * but Supabase Docker containers listen on 127.0.0.1.
 */
function normalizeSupabaseUrl(url: string): string {
  // Replace localhost with 127.0.0.1 to force IPv4
  return url.replace(/localhost/gi, '127.0.0.1')
}

/**
 * Create a custom fetch with timeout for Supabase admin operations.
 * Uses AbortSignal.timeout to ensure requests don't hang indefinitely.
 */
function createTimeoutFetch(timeoutMs: number = 60000): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const response = await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs)
      })
      return response
    } catch (error: any) {
      // Provide clear diagnostics for timeout errors
      // AbortSignal.timeout throws DOMException with name 'TimeoutError'
      // undici throws with code 'UND_ERR_HEADERS_TIMEOUT'
      if (error.name === 'AbortError' || 
          error.name === 'TimeoutError' || 
          error.code === 'UND_ERR_HEADERS_TIMEOUT') {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'unknown'
        const isLocal = /^https?:\/\/127\.0\.0\.1|localhost/i.test(url)
        
        if (isLocal) {
          throw new Error(
            `Connection timeout to local Supabase at ${url}\n` +
            '\n' +
            'Possible causes:\n' +
            '  1. Supabase Docker containers not running (run: pnpm db:start)\n' +
            '  2. Docker Desktop not running or accessible\n' +
            '  3. Port conflict (check if port 55321 is in use)\n' +
            '  4. Firewall blocking localhost connections\n' +
            '\n' +
            'To verify Supabase is running:\n' +
            '  - Run: npx supabase status\n' +
            '  - Or: curl http://127.0.0.1:54321/rest/v1/ (or port 55321 if using main config)\n' +
            '\n' +
            'Original error: ' + (error.message || String(error))
          )
        } else {
          throw new Error(
            `Connection timeout to remote Supabase at ${url}\n` +
            '\n' +
            'Possible causes:\n' +
            '  1. Supabase project is paused or sleeping\n' +
            '  2. Network connectivity issues\n' +
            '  3. VPN or proxy intercepting requests\n' +
            '  4. Invalid SUPABASE_URL or SUPABASE_SECRET_KEY\n' +
            '\n' +
            'To verify:\n' +
            '  - Check Supabase dashboard: https://app.supabase.com\n' +
            '  - Verify project is active (not paused)\n' +
            '  - Test with: curl -H "Authorization: Bearer YOUR_KEY" ${url}/rest/v1/\n' +
            '\n' +
            'Original error: ' + (error.message || String(error))
          )
        }
      }
      throw error
    }
  }
}

export interface CreateAdminClientOptions {
  /**
   * Request timeout in milliseconds. Default: 60000 (60 seconds)
   */
  timeoutMs?: number
  /**
   * Whether to force IPv4 for localhost URLs. Default: true
   */
  forceIPv4?: boolean
}

/**
 * Create a Supabase admin client with proper timeout and IPv4 handling.
 * 
 * @param url - Supabase project URL
 * @param serviceRoleKey - Service role key (admin access)
 * @param options - Configuration options
 * @returns Configured Supabase admin client
 */
export function createSupabaseAdminClient(
  url: string,
  serviceRoleKey: string,
  options: CreateAdminClientOptions = {}
): SupabaseClient {
  const { timeoutMs = 60000, forceIPv4 = true } = options
  
  // Normalize URL to force IPv4 if requested
  const normalizedUrl = forceIPv4 ? normalizeSupabaseUrl(url) : url
  
  // Create custom fetch with timeout
  const timeoutFetch = createTimeoutFetch(timeoutMs)
  
  return createClient(normalizedUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: timeoutFetch
    }
  })
}


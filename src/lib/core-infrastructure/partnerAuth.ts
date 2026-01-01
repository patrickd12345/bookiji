/**
 * Partner Authentication
 * 
 * Authenticates partner API requests using API keys.
 */

import type { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

export interface PartnerAuthResult {
  success: boolean
  data?: {
    partnerId: string
    apiKey: string
  }
  error?: string
}

/**
 * Authenticate partner from request headers.
 */
export async function authenticatePartner(
  request: NextRequest
): Promise<PartnerAuthResult> {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing or invalid Authorization header',
    }
  }
  
  const apiKey = authHeader.substring(7) // Remove "Bearer "
  
  // TODO: Implement actual API key lookup from database
  // For now, this is a stub
  const supabase = getServerSupabase()
  
  // Check if API key exists and is valid
  const { data, error } = await supabase
    .from('partner_api_keys')
    .select('partner_id, is_active, expires_at')
    .eq('api_key', apiKey)
    .maybeSingle()
  
  if (error || !data) {
    return {
      success: false,
      error: 'Invalid API key',
    }
  }
  
  if (!data.is_active) {
    return {
      success: false,
      error: 'API key is inactive',
    }
  }
  
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return {
      success: false,
      error: 'API key has expired',
    }
  }
  
  return {
    success: true,
    data: {
      partnerId: data.partner_id,
      apiKey,
    },
  }
}

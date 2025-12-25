/**
 * Role switching utilities
 * Allows users to switch between customer and vendor roles while preserving session
 */

import { getServerSupabase } from '@/lib/supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

export interface RoleSwitchResult {
  success: boolean
  newRole: string
  error?: string
}

/**
 * Switch user role while preserving session
 * @param userId User ID
 * @param newRole New role to switch to ('customer' | 'vendor')
 * @returns Role switch result
 */
export async function switchUserRole(
  userId: string,
  newRole: 'customer' | 'vendor'
): Promise<RoleSwitchResult> {
  try {
    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, roles')
      .eq('auth_user_id', userId)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        newRole: newRole,
        error: 'Profile not found',
      }
    }

    // Update role in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (updateError) {
      return {
        success: false,
        newRole: newRole,
        error: updateError.message,
      }
    }

    // Update roles array if it exists
    const currentRoles = (profile.roles as string[]) || []
    const hasNewRole = currentRoles.includes(newRole)
    
    if (!hasNewRole) {
      // Add new role to roles array
      const updatedRoles = [...currentRoles, newRole]
      await supabase
        .from('profiles')
        .update({
          roles: updatedRoles,
        })
        .eq('id', profile.id)
    }

    return {
      success: true,
      newRole: newRole,
    }
  } catch (error) {
    return {
      success: false,
      newRole: newRole,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get available roles for a user
 */
export async function getAvailableRoles(userId: string): Promise<string[]> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles, role')
      .eq('auth_user_id', userId)
      .single()

    if (!profile) return []

    // Return roles array or single role as array
    if (profile.roles && Array.isArray(profile.roles)) {
      return profile.roles
    }
    
    if (profile.role) {
      return [profile.role]
    }

    return []
  } catch (error) {
    console.error('Error getting available roles:', error)
    return []
  }
}

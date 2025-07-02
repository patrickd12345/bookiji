import { useEffect, useState } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '../src/lib/supabaseClient'

interface UserProfile {
  user_id: string
  email?: string
  full_name?: string
  roles: string[]
  can_book_services: boolean
  can_offer_services: boolean
  is_admin: boolean
  created_at?: string
  updated_at?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_role_summary')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data as UserProfile
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      return null
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id).then(setProfile)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user.id)
          setProfile(userProfile)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    // Fallback: ensure loading doesn't hang indefinitely
    const fallback = setTimeout(() => setLoading(false), 1000)

    return () => {
      clearTimeout(fallback)
      subscription.unsubscribe()
    }
  }, [])

  // Helper functions for role checking
  const hasRole = (role: string): boolean => {
    return profile?.roles?.includes(role) ?? false
  }

  const addRole = async (role: string): Promise<boolean> => {
    if (!user) return false
    
    try {
      const { error } = await supabase.rpc('add_user_role', {
        target_user_id: user.id,
        new_role: role
      })
      
      if (!error) {
        // Refresh profile
        const updatedProfile = await fetchUserProfile(user.id)
        setProfile(updatedProfile)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error adding role:', error)
      return false
    }
  }

  const removeRole = async (role: string): Promise<boolean> => {
    if (!user) return false
    
    try {
      const { error } = await supabase.rpc('remove_user_role', {
        target_user_id: user.id,
        old_role: role
      })
      
      if (!error) {
        // Refresh profile
        const updatedProfile = await fetchUserProfile(user.id)
        setProfile(updatedProfile)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error removing role:', error)
      return false
    }
  }

  return {
    user,
    profile,
    loading,
    // Convenience flags
    isAuthenticated: !!user,
    canBookServices: profile?.can_book_services ?? false,
    canOfferServices: profile?.can_offer_services ?? false,
    isAdmin: profile?.is_admin ?? false,
    // Role checking functions
    hasRole,
    addRole,
    removeRole,
    // Raw roles array
    roles: profile?.roles ?? []
  }
} 
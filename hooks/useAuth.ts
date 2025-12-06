import { useEffect, useRef, useState } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { getSupabaseConfig } from '@/config/supabase'
import { ADSENSE_APPROVAL_MODE } from '../src/lib/adsense'

interface UserProfile {
  user_id: string
  email?: string
  full_name?: string
  beta_status?: string | null
  roles: string[]
  can_book_services: boolean
  can_offer_services: boolean
  is_admin: boolean
  created_at?: string
  updated_at?: string
}

interface UserCapabilities {
  canBookServices: boolean
  canOfferServices: boolean
  isAdmin: boolean
}

export function getUserCapabilities(profile: UserProfile | null): UserCapabilities {
  const roles = profile?.roles || []
  const isAdmin = roles.includes('admin')

  return {
    canBookServices: roles.includes('customer') || isAdmin,
    canOfferServices: roles.includes('vendor') || isAdmin,
    isAdmin
  }
}

const mapToUserProfile = (record: any, fallbackUserId?: string): UserProfile => {
  const roles = Array.isArray(record?.roles)
    ? record.roles
    : record?.role
      ? [record.role]
      : ['customer']

  const isAdmin = record?.is_admin ?? roles.includes('admin')

  return {
    user_id: record?.user_id || record?.id || fallbackUserId || 'unknown-user',
    email: record?.email || 'unknown@example.com',
    full_name: record?.full_name || 'User',
    beta_status: record?.beta_status ?? null,
    roles,
    can_book_services: record?.can_book_services ?? (roles.includes('customer') || isAdmin),
    can_offer_services: record?.can_offer_services ?? (roles.includes('vendor') || isAdmin),
    is_admin: isAdmin,
    created_at: record?.created_at ?? new Date().toISOString(),
    updated_at: record?.updated_at ?? new Date().toISOString()
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const lastFetchedUserIdRef = useRef<string | null>(null)
  const initialProfileFetchedRef = useRef(false)
  const profileRef = useRef<UserProfile | null>(null)
  const creationAttemptedRef = useRef<Set<string>>(new Set())

  // Temporary bypass for AdSense approval
  const isAdSenseApprovalMode = ADSENSE_APPROVAL_MODE

  // Test database connection and table existence with CSP-safe approach
  const testDatabaseConnection = async () => {
    try {
      if (process.env.NODE_ENV !== 'development') return true;
      
      console.log('Testing database connection...');
      
      // Check if we have valid Supabase configuration first
      try {
        const config = getSupabaseConfig();
        if (!config.url || config.url.includes('dummy')) {
          console.warn('⚠️ Using dummy Supabase configuration - database features disabled');
          return false;
        }
      } catch (configError) {
        console.warn('⚠️ Supabase configuration invalid:', configError);
        return false;
      }
      
      // Test basic connection with error handling for 500 errors
      try {
        const { error: testError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (testError) {
          if (testError.code === '500' || testError.message.includes('500')) {
            console.error('❌ Server error (500) accessing profiles table');
            return false;
          }
          if (testError.message.includes('CSP') || testError.message.includes('violates')) {
            console.warn('⚠️ CSP policy blocking database connection - check environment variables');
            return false;
          }
          console.error('Database connection test failed:', testError);
          return false;
        }
        
        console.log('✅ Database connection successful, profiles table accessible');
        return true;
      } catch (error) {
        console.error('❌ Exception testing profiles table access:', error);
        return false;
      }
    } catch (error) {
      console.error('Exception testing database connection:', error);
      return false;
    }
  };

  const fetchUserProfile = async (userId: string) => {
    // Guard against redundant rapid re-fetches for the same user
    if (lastFetchedUserIdRef.current === userId) {
      // Already fetched recently in this render cycle
      return profileRef.current
    }
    lastFetchedUserIdRef.current = userId
    try {
      console.log('Fetching user profile for:', userId)
      
      // First try to get the full profile with beta_status
      const { data, error } = await supabase
        .from('user_role_summary')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        if (error.code === '500' || error.message.includes('500')) {
          console.log('⚠️ Server error (500) accessing user_role_summary view - view may be corrupted')
        } else {
          console.log('Full profile query failed, trying fallback query...')
        }
        
        // Fallback: query profiles table directly if user_role_summary fails
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, created_at, updated_at')
            .eq('id', userId)
            .maybeSingle()
          
          if (profileError) {
            if (profileError.code === '500' || profileError.message.includes('500')) {
              console.error('❌ Server error (500) accessing profiles table - table may be corrupted')
              // Return a minimal profile to prevent app crashes
              return mapToUserProfile({ user_id: userId, role: 'customer' }, userId)
            }
            console.error('Fallback profile query also failed:', profileError)
            return null
          }
          
          if (!profileData) {
            console.log('No profile found for user:', userId)
            return null
          }
          
          // Create a basic UserProfile from profiles table data
          const fallbackProfile: UserProfile = mapToUserProfile(profileData, userId)
          
          console.log('Created fallback profile:', fallbackProfile)
          return fallbackProfile
        } catch (fallbackError) {
          console.error('❌ Exception in fallback profile query:', fallbackError)
          // Return a minimal profile to prevent app crashes
          return mapToUserProfile({ user_id: userId, role: 'customer' }, userId)
        }
      }

      if (!data) {
        console.log('No user profile found for:', userId)
        // Return null - let server-side API handle profile creation/repair
        // Client-side profile creation is unsafe and can pollute data without proper validation
        console.warn('Profile creation should happen through authenticated API endpoints, not client-side')
        return null
      }

      // Ensure beta_status is present (set to null if missing)
      const profile = mapToUserProfile({ ...data, beta_status: data.beta_status || null }, userId)

      console.log('User profile fetched successfully:', profile)
      return profile
    } catch (error) {
      console.error('Exception in fetchUserProfile:', error)
      // Return a minimal profile to prevent app crashes
      return mapToUserProfile({ user_id: userId, role: 'customer' }, userId)
    }
  }

  const createProfileViaApi = async (userId: string): Promise<UserProfile | null> => {
    if (creationAttemptedRef.current.has(userId)) {
      return null
    }

    creationAttemptedRef.current.add(userId)

    try {
      const response = await fetch('/api/auth/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'customer' }),
        credentials: 'include'
      })

      if (!response.ok) {
        console.warn('Profile creation request failed:', response.status)
        return null
      }

      const result = await response.json()
      if (result?.profile) {
        return mapToUserProfile(result.profile, userId)
      }
    } catch (error) {
      console.error('Error creating profile via API:', error)
    }

    return null
  }

  const loadProfileForUser = async (userId: string) => {
    const userProfile = await fetchUserProfile(userId)
    if (userProfile) {
      setProfile(userProfile)
      return
    }

    const createdProfile = await createProfileViaApi(userId)
    if (createdProfile) {
      setProfile(createdProfile)
    } else {
      setProfile(null)
    }
  }

  useEffect(() => {
    if (isAdSenseApprovalMode) {
      setLoading(false);
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      testDatabaseConnection().then(isConnected => {
        if (!isConnected) {
          console.error('Database connection failed, authentication may not work properly');
        }
      });
    }

    console.log('Setting up authentication listeners...')

    // Timeout fallback that will be cleared as soon as loading completes
    let fallback: ReturnType<typeof setTimeout> | null = null

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error('Error getting initial session:', sessionError)
      }
      
      console.log('Initial session:', session ? 'exists' : 'none')
      setUser(session?.user ?? null)
      
      if (session?.user) {
        console.log('User authenticated:', session.user.id)
        loadProfileForUser(session.user.id).then(() => {
          initialProfileFetchedRef.current = true
        })
      } else {
        console.log('No user session found')
      }
      setLoading(false)
      if (fallback) {
        clearTimeout(fallback)
        fallback = null
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state change:', event, session ? 'user exists' : 'no user')
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Skip duplicate fetch on INITIAL_SESSION if we already fetched
          if (event === 'INITIAL_SESSION' && initialProfileFetchedRef.current) {
            return
          }
          // Avoid refetch if we've already fetched for this user in this lifecycle
          if (lastFetchedUserIdRef.current === session.user.id) {
            return
          }
          console.log('Fetching profile for user:', session.user.id)
          await loadProfileForUser(session.user.id)
        } else {
          console.log('Clearing user profile')
          setProfile(null)
        }
        
        setLoading(false)
        if (fallback) {
          clearTimeout(fallback)
          fallback = null
        }
      }
    )

    // Fallback: ensure loading doesn't hang indefinitely
    fallback = setTimeout(() => {
      console.log('Loading timeout fallback triggered')
      setLoading(false)
    }, 1000)

    return () => {
      if (fallback) clearTimeout(fallback)
      subscription.unsubscribe()
    }
  }, [isAdSenseApprovalMode])

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  // Helper functions for role checking



  return {
    user: isAdSenseApprovalMode ? { id: 'adsense-reviewer', email: 'reviewer@google.com' } as User : user,
    profile: isAdSenseApprovalMode ? {
      user_id: 'adsense-reviewer',
      email: 'reviewer@google.com',
      full_name: 'AdSense Reviewer',
      roles: ['customer', 'vendor'],
      can_book_services: true,
      can_offer_services: true,
      is_admin: false
    } as UserProfile : profile,
    loading: isAdSenseApprovalMode ? false : loading,
    // Convenience flags
    isAuthenticated: isAdSenseApprovalMode ? true : !!user,
    ...getUserCapabilities(isAdSenseApprovalMode ? {
      user_id: 'adsense-reviewer',
      email: 'reviewer@google.com',
      full_name: 'AdSense Reviewer',
      roles: ['customer', 'vendor'],
      can_book_services: true,
      can_offer_services: true,
      is_admin: false
    } as UserProfile : profile),
    // Role checking functions (commented out to avoid unused variable warnings)
    // hasRole: (role: string): boolean => {
    //   if (isAdSenseApprovalMode) return ['customer', 'vendor'].includes(role)
    //   return profile?.roles?.includes(role) ?? false
    // },
    // addRole: async (role: string): Promise<boolean> => {
    //   if (isAdSenseApprovalMode) return true
    //   if (!user) return false
    //   
    //   try {
    //     const { error } = await supabase.rpc('add_user_role', {
    //       target_user_id: user.id,
    //       new_role: role
    //     })
    //     
    //     if (!error) {
    //       // Refresh profile
    //       const updatedProfile = await fetchUserProfile(user.id)
    //       setProfile(updatedProfile)
    //       return true
    //     }
    //     
    //     return false
    //   } catch (error) {
    //     console.error('Error adding role:', error)
    //     return false
    //   }
    // },
    // removeRole: async (role: string): Promise<boolean> => {
    //   if (isAdSenseApprovalMode) return true
    //   if (!user) return false
    //   
    //   try {
    //     const { error } = await supabase.rpc('remove_user_role', {
    //       target_user_id: user.id,
    //       old_role: role
    //     })
    //     
    //     if (!error) {
    //       // Refresh profile
    //       const updatedProfile = await fetchUserProfile(user.id)
    //       setProfile(updatedProfile)
    //       return true
    //     }
    //     
    //     return false
    //   } catch (error) {
    //     console.error('Error removing role:', error)
    //     return false
    //   }
    // },
    // Raw roles array
    roles: isAdSenseApprovalMode ? ['customer', 'vendor'] : (profile?.roles ?? [])
  }
} 

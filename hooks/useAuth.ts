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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const lastFetchedUserIdRef = useRef<string | null>(null)
  const initialProfileFetchedRef = useRef(false)
  const profileRef = useRef<UserProfile | null>(null)

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
              return {
                user_id: userId,
                email: 'unknown@example.com',
                full_name: 'User',
                beta_status: null,
                roles: ['customer'],
                can_book_services: true,
                can_offer_services: false,
                is_admin: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            }
            console.error('Fallback profile query also failed:', profileError)
            return null
          }
          
          if (!profileData) {
            console.log('No profile found for user:', userId)
            return null
          }
          
          // Create a basic UserProfile from profiles table data
          const fallbackProfile: UserProfile = {
            user_id: profileData.id,
            email: profileData.email,
            full_name: profileData.full_name,
            beta_status: null, // Not available in profiles table
            roles: profileData.role ? [profileData.role] : ['customer'],
            can_book_services: profileData.role === 'customer' || profileData.role === 'admin',
            can_offer_services: profileData.role === 'vendor' || profileData.role === 'admin',
            is_admin: profileData.role === 'admin',
            created_at: profileData.created_at,
            updated_at: profileData.updated_at
          }
          
          console.log('Created fallback profile:', fallbackProfile)
          return fallbackProfile
        } catch (fallbackError) {
          console.error('❌ Exception in fallback profile query:', fallbackError)
          // Return a minimal profile to prevent app crashes
          return {
            user_id: userId,
            email: 'unknown@example.com',
            full_name: 'User',
            beta_status: null,
            roles: ['customer'],
            can_book_services: true,
            can_offer_services: false,
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      }

      if (!data) {
        console.log('No user profile found for:', userId)
        // Attempt to auto-create a minimal profile row for the user to stabilize UX
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle()

          if (!existingProfile) {
            const { error: upsertError } = await supabase
              .from('profiles')
              .upsert({ id: userId, full_name: 'User', role: 'customer' }, { onConflict: 'id' })

            if (upsertError) {
              console.warn('Profile upsert error (non-fatal):', upsertError)
            }
          }

          // Re-fetch after ensuring profile row exists
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, created_at, updated_at')
            .eq('id', userId)
            .maybeSingle()

          if (profileRow) {
            const fallbackProfile: UserProfile = {
              user_id: profileRow.id,
              email: profileRow.email,
              full_name: profileRow.full_name,
              beta_status: null,
              roles: profileRow.role ? [profileRow.role] : ['customer'],
              can_book_services: profileRow.role === 'customer' || profileRow.role === 'admin',
              can_offer_services: profileRow.role === 'vendor' || profileRow.role === 'admin',
              is_admin: profileRow.role === 'admin',
              created_at: profileRow.created_at,
              updated_at: profileRow.updated_at
            }
            return fallbackProfile
          }
        } catch (createErr) {
          console.warn('Could not auto-create/fetch profile (non-fatal):', createErr)
        }
        return null
      }

      // Ensure beta_status is present (set to null if missing)
      const profile: UserProfile = {
        ...data,
        beta_status: data.beta_status || null
      }

      console.log('User profile fetched successfully:', profile)
      return profile
    } catch (error) {
      console.error('Exception in fetchUserProfile:', error)
      // Return a minimal profile to prevent app crashes
      return {
        user_id: userId,
        email: 'unknown@example.com',
        full_name: 'User',
        beta_status: null,
        roles: ['customer'],
        can_book_services: true,
        can_offer_services: false,
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
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
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }: { data: { session: Session | null }, error: any }) => {
      if (sessionError) {
        console.error('Error getting initial session:', sessionError)
      }
      
      console.log('Initial session:', session ? 'exists' : 'none')
      setUser(session?.user ?? null)
      
      if (session?.user) {
        console.log('User authenticated:', session.user.id)
        fetchUserProfile(session.user.id).then((p) => {
          setProfile(p)
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
          const userProfile = await fetchUserProfile(session.user.id)
          setProfile(userProfile)
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
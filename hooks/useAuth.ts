import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../src/lib/supabaseClient'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  return { user }
} 
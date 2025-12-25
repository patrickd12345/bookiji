'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'

interface LogoutButtonProps {
  className?: string
  variant?: 'default' | 'floating' | 'minimal'
  showLabel?: boolean
}

export function LogoutButton({ 
  className, 
  variant = 'default',
  showLabel = true 
}: LogoutButtonProps) {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = supabaseBrowserClient()
      if (!supabase) {
        setIsLoggedIn(false)
        setIsLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
      setIsLoading(false)

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsLoggedIn(!!session)
      })

      return () => subscription.unsubscribe()
    }

    checkAuth()
  }, [])

  const handleSignOut = async () => {
    const supabase = supabaseBrowserClient()
    if (supabase) {
      await supabase.auth.signOut()
      router.push('/')
    }
  }

  if (isLoading || !isLoggedIn) {
    return null
  }

  if (variant === 'floating') {
    return (
      <button
        onClick={handleSignOut}
        className={cn(
          'fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:shadow-xl transition-all hover:bg-gray-50 dark:hover:bg-gray-700',
          className
        )}
        data-test="floating-logout"
        title="Log out"
      >
        <LogOut className="h-4 w-4" />
        {showLabel && <span className="text-sm font-medium">Log out</span>}
      </button>
    )
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleSignOut}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors',
          className
        )}
        data-test="logout-minimal"
        title="Log out"
      >
        <LogOut className="h-4 w-4" />
        {showLabel && <span>Log out</span>}
      </button>
    )
  }

  return (
    <button
      onClick={handleSignOut}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors',
        className
      )}
      data-test="logout-default"
    >
      <LogOut className="h-4 w-4" />
      {showLabel && <span>Log out</span>}
    </button>
  )
}




'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabaseBrowserClient } from '@/lib/supabaseClient'

const navItems = [
  { href: '/provider/profile', label: 'Profile', icon: User },
  { href: '/provider/analytics', label: 'Analytics', icon: BarChart3 },
]

export function ProviderNavigation() {
  const pathname = usePathname()
  const [isProvider, setIsProvider] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkProviderRole = async () => {
      const supabase = supabaseBrowserClient()
      if (!supabase) {
        setIsLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsProvider(false)
        setIsLoading(false)
        return
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        // Check if user is provider/vendor or admin (admins can access provider pages)
        const role = profile?.role
        setIsProvider(role === 'provider' || role === 'vendor' || role === 'admin')
      } catch (error) {
        console.error('Error checking provider role:', error)
        setIsProvider(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkProviderRole()
  }, [])

  // Don't render navigation if user is not a provider/vendor/admin
  if (!isLoading && !isProvider) {
    return null
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}


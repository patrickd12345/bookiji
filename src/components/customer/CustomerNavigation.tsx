'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, Heart, User, Settings, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabaseBrowserClient } from '@/lib/supabaseClient'

const navItems = [
  { href: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customer/bookings', label: 'Bookings', icon: Calendar },
  { href: '/customer/favorites', label: 'Favorites', icon: Heart },
  { href: '/customer/profile', label: 'Profile', icon: User },
  { href: '/customer/credits', label: 'Credits', icon: CreditCard },
  { href: '/customer/dashboard/settings', label: 'Settings', icon: Settings },
]

export function CustomerNavigation() {
  const pathname = usePathname()
  const [isCustomer, setIsCustomer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkCustomerRole = async () => {
      const supabase = supabaseBrowserClient()
      if (!supabase) {
        setIsLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsCustomer(false)
        setIsLoading(false)
        return
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        // Check if user is customer or admin (admins can access customer pages)
        const role = profile?.role
        setIsCustomer(role === 'customer' || role === 'admin')
      } catch (error) {
        console.error('Error checking customer role:', error)
        setIsCustomer(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkCustomerRole()
  }, [])

  // Don't render navigation if user is not a customer/admin
  if (!isLoading && !isCustomer) {
    return null
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== '/customer/dashboard' && pathname?.startsWith(item.href))

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


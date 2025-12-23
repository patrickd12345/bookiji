'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, LayoutDashboard, HelpCircle, FileText, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabaseBrowserClient } from '@/lib/supabaseClient'

const navItems = [
  { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendor/calendar', label: 'Calendar', icon: Calendar },
  { href: '/vendor/schedule', label: 'Schedule', icon: Clock },
  { href: '/vendor/requests', label: 'Requests', icon: FileText },
  { href: '/vendor/help', label: 'Help', icon: HelpCircle },
]

export function VendorNavigation() {
  const pathname = usePathname()
  const [isVendor, setIsVendor] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkVendorRole = async () => {
      const supabase = supabaseBrowserClient()
      if (!supabase) {
        setIsLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsVendor(false)
        setIsLoading(false)
        return
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        // Check if user is vendor or admin (admins can access vendor pages)
        const role = profile?.role
        setIsVendor(role === 'vendor' || role === 'admin')
      } catch (error) {
        console.error('Error checking vendor role:', error)
        setIsVendor(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkVendorRole()
  }, [])

  // Don't render navigation if user is not a vendor/admin
  if (!isLoading && !isVendor) {
    return null
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== '/vendor/dashboard' && pathname?.startsWith(item.href))

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


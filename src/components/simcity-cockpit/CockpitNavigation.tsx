'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, BarChart3, GitCompare } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin/simcity/cockpit', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/simcity/cockpit/proposals', label: 'Proposals', icon: FileText },
  { href: '/admin/simcity/cockpit/metrics', label: 'Metrics & Dials', icon: BarChart3 },
  { href: '/admin/simcity/cockpit/replays', label: 'Replays & Diffs', icon: GitCompare },
]

export function CockpitNavigation() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== '/admin/simcity/cockpit' && pathname?.startsWith(item.href))

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


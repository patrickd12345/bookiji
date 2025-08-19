'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, LifeBuoy, Database, Settings } from 'lucide-react'
import { ADSENSE_APPROVAL_MODE } from '@/lib/adsense'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const checkAuthentication = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/check-admin', { method: 'GET', credentials: 'include' })
      if (!response.ok) throw new Error('Admin check failed')
      const { isAdmin } = await response.json()
      console.log('Admin check result:', { isAdmin, url: window.location.href })
      if (!isAdmin) {
        console.log('Non-admin user - will show access denied message')
        setIsAuthenticated(false)
        return
      }
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Admin check error:', error)
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => { checkAuthentication() }, [checkAuthentication])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Verifying admin access</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-sm text-gray-500">You don&apos;t have permission to access this area.</p>
        </div>
      </div>
    )
  }

  type IconType = React.ComponentType<{ size?: number; className?: string }>
  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: IconType; label: string }) => (
    <Link href={href} className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 ${pathname?.startsWith(href) ? 'bg-gray-100 font-medium' : ''}`}>
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 border-r bg-white p-4 space-y-2">
        <div className="text-lg font-semibold mb-2">Admin Console</div>
        <nav className="flex flex-col gap-1">
          <NavLink href="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavLink href="/admin/support-tickets" icon={LifeBuoy} label="Support Tickets" />
          <NavLink href="/admin/rag" icon={Database} label="RAG Knowledge Base" />
          <NavLink href="/admin/parameters" icon={Settings} label="Admin Parameters" />
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
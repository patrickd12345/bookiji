'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'

interface UserProfile {
  full_name: string | null
  email: string | null
  role: string | null
}

export default function Navbar() {
  const router = useRouter()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const loadUserProfile = async () => {
      const supabase = supabaseBrowserClient()
      if (!supabase) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        // Check admin status first
        let userIsAdmin = false
        try {
          const adminResponse = await fetch('/api/auth/check-admin')
          const adminData = await adminResponse.json()
          userIsAdmin = adminData.isAdmin === true
          setIsAdmin(userIsAdmin)
        } catch (error) {
          console.error('Error checking admin status:', error)
          setIsAdmin(false)
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, email, role')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('Error loading profile:', error)
          // Fallback to auth user email
          setUserProfile({
            full_name: session.user.user_metadata?.full_name || null,
            email: session.user.email || null,
            role: userIsAdmin ? 'admin' : 'customer' // Use admin status if available
          })
        } else {
          // If user is admin (via email allow-list), override role to admin
          const finalRole = userIsAdmin ? 'admin' : (profile?.role || 'customer')
          setUserProfile({
            full_name: profile?.full_name || null,
            email: profile?.email || session.user.email || null,
            role: finalRole
          })
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }

    loadUserProfile()
  }, [])

  const toggleNotifications = () => setIsNotificationsOpen(!isNotificationsOpen)
  const toggleProfile = () => setIsProfileOpen(!isProfileOpen)

  const handleSignOut = async () => {
    const supabase = supabaseBrowserClient()
    if (supabase) {
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  const displayName = userProfile?.full_name || 'User'
  const displayEmail = userProfile?.email || ''
  const displayRole = userProfile?.role || 'customer'
  // Determine role label: admin takes precedence, then use profile role
  const roleLabel = isAdmin ? 'Admin' : 
    displayRole === 'vendor' ? 'Provider' : 
    displayRole === 'customer' ? 'Customer' : 
    displayRole.charAt(0).toUpperCase() + displayRole.slice(1)

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Bookiji Admin</h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <a href="/admin/dashboard" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
              Dashboard
            </a>
            <a href="/admin/bookings" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
              Bookings
            </a>
            <a href="/admin/vendors" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
              Vendors
            </a>
            <a href="/admin/customers" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
              Customers
            </a>
            <a href="/admin/analytics" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
              Analytics
            </a>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-colors duration-200 relative"
              >
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <button className="text-sm text-blue-600 hover:text-blue-700">Mark all read</button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">New vendor registration</p>
                          <p className="text-xs text-gray-600">Garden Masters joined the platform</p>
                          <p className="text-xs text-gray-500">2 minutes ago</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Booking completed</p>
                          <p className="text-xs text-gray-600">Computer repair service completed</p>
                          <p className="text-xs text-gray-500">1 hour ago</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={toggleProfile}
                className="flex items-center gap-2 p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-colors duration-200"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="text-white" size={16} />
                </div>
                <span className="hidden md:block font-medium">{displayName}</span>
                <span className="hidden md:block text-xs text-gray-500 ml-1">({roleLabel})</span>
                <ChevronDown 
                  size={16} 
                  className={`transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{displayName}</p>
                      <p className="text-xs text-gray-500">{displayEmail}</p>
                      <p className="text-xs text-gray-400 mt-1">{roleLabel}</p>
                    </div>
                    
                    <div className="py-1">
                      <Link 
                        href="/settings/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      >
                        <User size={16} />
                        Profile
                      </Link>
                      <Link 
                        href="/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      >
                        <Settings size={16} />
                        Settings
                      </Link>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-1">
                      <button 
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}







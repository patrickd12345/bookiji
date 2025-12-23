'use client'

import { useState, useEffect } from 'react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { User, Mail, Phone, Calendar, Shield, Edit } from 'lucide-react'
import Link from 'next/link'

interface Profile {
  id: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  created_at: string
  verification_status?: 'verified' | 'pending' | 'unverified'
}

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = supabaseBrowserClient()
      if (!supabase) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-600">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your personal information</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name || 'Profile'}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{profile.name || 'No name set'}</h2>
              {profile.verification_status && (
                <div className="flex items-center gap-2 mt-1">
                  <Shield className={`w-4 h-4 ${
                    profile.verification_status === 'verified' ? 'text-green-500' : 'text-gray-400'
                  }`} />
                  <span className="text-sm text-gray-600 capitalize">{profile.verification_status}</span>
                </div>
              )}
            </div>
          </div>
          <Link
            href="/customer/dashboard/settings"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </Link>
        </div>

        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-4">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900">{profile.email}</p>
            </div>
          </div>

          {profile.phone && (
            <div className="flex items-center gap-4">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-gray-900">{profile.phone}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="text-gray-900">
                {new Date(profile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


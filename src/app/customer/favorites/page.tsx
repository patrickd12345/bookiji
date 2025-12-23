'use client'

import { useState, useEffect } from 'react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { Heart, Star, MapPin, Phone, Mail } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Provider {
  id: string
  business_name: string
  avatar_url?: string
  rating: number
  total_reviews: number
  specialties: string[]
  location?: string
}

export default function CustomerFavoritesPage() {
  const [favorites, setFavorites] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFavorites = async () => {
      const supabase = supabaseBrowserClient()
      if (!supabase) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        const { data, error } = await supabase
          .from('favorite_providers')
          .select('provider_id, providers(*)')
          .eq('user_id', session.user.id)

        if (error) throw error

        const providers = (data || [])
          .map(fp => fp.providers)
          .filter(Boolean) as unknown as Provider[]
        
        setFavorites(providers)
      } catch (error) {
        console.error('Error loading favorites:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Favorite Providers</h1>
        <p className="text-gray-600">Your saved service providers</p>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No favorites yet</h3>
          <p className="text-gray-600 mb-6">
            Start exploring providers and add them to your favorites for quick access.
          </p>
          <Link
            href="/get-started"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Find Providers
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((provider) => (
            <div key={provider.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                {provider.avatar_url ? (
                  <Image
                    src={provider.avatar_url}
                    alt={provider.business_name}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-400">
                      {provider.business_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{provider.business_name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium text-gray-900">{provider.rating}</span>
                    <span className="text-sm text-gray-500">({provider.total_reviews} reviews)</span>
                  </div>
                </div>
              </div>

              {provider.specialties && provider.specialties.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {provider.specialties.slice(0, 3).map((specialty, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {provider.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <MapPin className="w-4 h-4" />
                  {provider.location}
                </div>
              )}

              <div className="flex gap-2">
                <Link
                  href={`/book/${provider.id}`}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Book Now
                </Link>
                <Link
                  href={`/providers/${provider.id}`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


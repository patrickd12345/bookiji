'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface SearchFilters {
  query: string
  location: string
  latitude?: number
  longitude?: number
  radius: number
  service_category: string
  min_rating: number
  max_price: number
  availability_date: string
  availability_time: string
  sort_by: 'distance' | 'rating' | 'price' | 'availability' | 'popularity'
}

interface Provider {
  id: string
  name: string
  business_name?: string
  average_rating: number
  total_reviews: number
  distance?: number
  services: {
    id: string
    name: string
    category: string
    price: number
    duration: number
  }[]
  provider_locations: {
    id: string
    name: string
    address: string
    latitude: number
    longitude: number
    is_primary: boolean
  }[]
}

interface AdvancedSearchProps {
  onResults?: (results: { providers: Provider[], total: number }) => void
  defaultLocation?: string
  showMap?: boolean
}

export default function AdvancedSearch({ 
  onResults,
  defaultLocation = '',
  showMap = true 
}: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    location: defaultLocation,
    radius: 10,
    service_category: '',
    min_rating: 0,
    max_price: 1000,
    availability_date: '',
    availability_time: '',
    sort_by: 'rating'
  })

  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const serviceCategories = [
    'Beauty & Wellness',
    'Health & Fitness',
    'Home Services',
    'Automotive',
    'Professional Services',
    'Education & Tutoring',
    'Creative & Arts',
    'Food & Beverage',
    'Other'
  ]

  const performSearch = useCallback(async () => {
    if (!filters.query && !filters.location) return

    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '' && value !== 0) {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/search/providers?${queryParams}`)
      const result = await response.json()

      if (result.success && result.providers) {
        onResults?.({
          providers: result.providers as Provider[],
          total: result.total || 0
        })
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }, [filters, onResults])

  useEffect(() => {
    // Check geolocation permission
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(result => {
        // Permission state handled silently
      })
    }
  }, [])

  useEffect(() => {
    // Auto-search when filters change (debounced)
    const timer = setTimeout(() => {
      if (filters.query || filters.location) {
        performSearch()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [filters, performSearch])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
          )
          const data = await response.json()
          const address = data.features[0]?.place_name || `${latitude}, ${longitude}`
          
          setFilters(prev => ({
            ...prev,
            location: address,
            latitude,
            longitude
          }))
        } catch (error) {
          console.error('Reverse geocoding failed:', error)
          setFilters(prev => ({
            ...prev,
            location: `${latitude}, ${longitude}`,
            latitude,
            longitude
          }))
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        alert('Unable to get your location. Please enter it manually.')
      }
    )
  }

  const getSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const response = await fetch('/api/search/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location: filters.location
        })
      })
      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error('Failed to get suggestions:', error)
    }
  }

  const handleQueryChange = (value: string) => {
    setFilters(prev => ({ ...prev, query: value }))
    getSuggestions(value)
  }

  const selectSuggestion = (suggestion: string) => {
    setFilters(prev => ({ ...prev, query: suggestion }))
    setShowSuggestions(false)
    searchInputRef.current?.focus()
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      location: defaultLocation,
      radius: 10,
      service_category: '',
      min_rating: 0,
      max_price: 1000,
      availability_date: '',
      availability_time: '',
      sort_by: 'rating'
    })
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Search Header */}
      <div className="relative">
        <div className="flex gap-4 mb-4">
          {/* Search Query */}
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={filters.query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="What service are you looking for?"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg z-50 max-h-64 overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Enter location or zip code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg pr-12"
            />
            <button
              onClick={getCurrentLocation}
              className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 hover:text-blue-600"
              title="Use current location"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Search Button */}
          <button
            onClick={performSearch}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Service Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.service_category}
                onChange={(e) => setFilters(prev => ({ ...prev, service_category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {serviceCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Radius (km)</label>
              <select
                value={filters.radius}
                onChange={(e) => setFilters(prev => ({ ...prev, radius: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
              <select
                value={filters.min_rating}
                onChange={(e) => setFilters(prev => ({ ...prev, min_rating: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Any Rating</option>
                <option value={3}>3+ Stars</option>
                <option value={4}>4+ Stars</option>
                <option value={4.5}>4.5+ Stars</option>
              </select>
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
              <select
                value={filters.max_price}
                onChange={(e) => setFilters(prev => ({ ...prev, max_price: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1000}>Any Price</option>
                <option value={50}>$50</option>
                <option value={100}>$100</option>
                <option value={200}>$200</option>
                <option value={500}>$500</option>
              </select>
            </div>

            {/* Availability Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={filters.availability_date}
                onChange={(e) => setFilters(prev => ({ ...prev, availability_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Availability Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <select
                value={filters.availability_time}
                onChange={(e) => setFilters(prev => ({ ...prev, availability_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Any Time</option>
                <option value="morning">Morning (6AM-12PM)</option>
                <option value="afternoon">Afternoon (12PM-6PM)</option>
                <option value="evening">Evening (6PM-12AM)</option>
                <option value="night">Night (12AM-6AM)</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sort_by}
                onChange={(e) => setFilters(prev => ({ ...prev, sort_by: e.target.value as SearchFilters['sort_by'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="rating">Rating</option>
                <option value="distance">Distance</option>
                <option value="price">Price</option>
                <option value="availability">Availability</option>
                <option value="popularity">Popularity</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
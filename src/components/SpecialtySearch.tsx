'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, MapPin, Star, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'


interface Specialty {
  id: string
  name: string
  slug: string
  parent_id: string | null
  path: string
}

interface Provider {
  id: string
  full_name: string
  business_name: string
  average_rating: number
  total_reviews: number
  business_address: string
  distance?: number
  specialties: Array<{
    specialty_id: string
    is_primary: boolean
    specialty: {
      name: string
    }
  }>
}

interface SearchFilters {
  query: string
  location: string
  specialtyIds: string[]
  minRating: number
  maxDistance: number
  maxPrice: number
  availability: string
}

export default function SpecialtySearch() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    location: '',
    specialtyIds: [],
    minRating: 0,
    maxDistance: 50,
    maxPrice: 1000,
    availability: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('')

  useEffect(() => {
    loadSpecialties()
  }, [])

  useEffect(() => {
    if (filters.query || filters.specialtyIds.length > 0 || filters.location) {
      performSearch()
    }
  }, [filters])

  const loadSpecialties = async () => {
    try {
      const response = await fetch('/api/specialties')
      if (response.ok) {
        const data = await response.json()
        setSpecialties(data.items || [])
      }
    } catch (error) {
      console.error('Error loading specialties:', error)
    }
  }

  const performSearch = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      
      if (filters.query) queryParams.append('query', filters.query)
      if (filters.location) queryParams.append('location', filters.location)
      if (filters.specialtyIds.length > 0) queryParams.append('specialty_ids', filters.specialtyIds.join(','))
      if (filters.minRating > 0) queryParams.append('min_rating', filters.minRating.toString())
      if (filters.maxDistance < 50) queryParams.append('maxTravelDistance', filters.maxDistance.toString())
      if (filters.maxPrice < 1000) queryParams.append('max_price', filters.maxPrice.toString())
      if (filters.availability) queryParams.append('availability_date', filters.availability)

      const response = await fetch(`/api/search/providers?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setProviders(data.providers || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSpecialtyToggle = (specialtyId: string) => {
    setFilters(prev => ({
      ...prev,
      specialtyIds: prev.specialtyIds.includes(specialtyId)
        ? prev.specialtyIds.filter(id => id !== specialtyId)
        : [...prev.specialtyIds, specialtyId]
    }))
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      location: '',
      specialtyIds: [],
      minRating: 0,
      maxDistance: 50,
      maxPrice: 1000,
      availability: ''
    })
  }

  const getSpecialtyPath = (specialty: Specialty): string => {
    if (!specialty.parent_id) return specialty.name
    
    const parent = specialties.find(s => s.id === specialty.parent_id)
    if (parent) {
      return `${parent.name} > ${specialty.name}`
    }
    
    return specialty.name
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 4.0) return 'text-blue-600'
    if (rating >= 3.5) return 'text-yellow-600'
    return 'text-gray-600'
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Search Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Find the Perfect Service Provider</h1>
        <p className="text-xl text-gray-600">Search by specialty, location, and more to find exactly what you need</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="What service do you need?"
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="h-12 text-lg"
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Where are you located?"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="h-12 text-lg"
              />
            </div>
            <Button 
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="h-12 px-6"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </Button>
            <Button 
              onClick={performSearch}
              disabled={loading}
              className="h-12 px-8"
            >
              <Search className="h-5 w-5 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Specialty Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Service Specialties</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {specialties.map(specialty => (
                    <div key={specialty.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={specialty.id}
                        checked={filters.specialtyIds.includes(specialty.id)}
                        onChange={() => handleSpecialtyToggle(specialty.id)}
                        className="rounded"
                      />
                      <label htmlFor={specialty.id} className="text-sm">
                        {getSpecialtyPath(specialty)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium mb-3">Minimum Rating</label>
                <Select
                  value={filters.minRating.toString()}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, minRating: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any Rating</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Distance Filter */}
              <div>
                <label className="block text-sm font-medium mb-3">Max Distance</label>
                <Select
                  value={filters.maxDistance.toString()}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, maxDistance: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="50">50+ miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Filter */}
              <div>
                <label className="block text-sm font-medium mb-3">Max Price</label>
                <Select
                  value={filters.maxPrice.toString()}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, maxPrice: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">$100</SelectItem>
                    <SelectItem value="250">$250</SelectItem>
                    <SelectItem value="500">$500</SelectItem>
                    <SelectItem value="1000">$1000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {loading ? 'Searching...' : `${providers.length} Providers Found`}
          </h2>
          {providers.length > 0 && (
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Specialties</SelectItem>
                {specialties.map(specialty => (
                  <SelectItem key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {providers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers
              .filter(provider => 
                !selectedSpecialty || 
                provider.specialties.some(s => s.specialty_id === selectedSpecialty)
              )
              .map(provider => (
                <Card key={provider.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {provider.business_name || provider.full_name}
                        </CardTitle>
                        <p className="text-sm text-gray-600">{provider.business_address}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getRatingColor(provider.average_rating)}`}>
                          {provider.average_rating.toFixed(1)} ⭐
                        </div>
                        <p className="text-xs text-gray-500">
                          {provider.total_reviews} reviews
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Specialties */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Specialties:</p>
                        <div className="flex flex-wrap gap-1">
                          {provider.specialties.map((spec, index) => (
                            <Badge 
                              key={index} 
                              variant={spec.is_primary ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {spec.specialty.name}
                              {spec.is_primary && " (Primary)"}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Distance */}
                      {provider.distance && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-1" />
                          {provider.distance.toFixed(1)} miles away
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex space-x-2 pt-2">
                        <Button size="sm" className="flex-1">
                          View Profile
                        </Button>
                        <Button size="sm" variant="outline">
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {!loading && providers.length === 0 && filters.query && (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No providers found</h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or expanding your search area.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

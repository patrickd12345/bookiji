'use client'

import React, { useState } from 'react'
import AdvancedSearch from './AdvancedSearch'
import SearchResults from './SearchResults'

interface SearchResultsData {
  providers: any[]
  total: number
  searchQuery: string
  location: string
  latitude?: number
  longitude?: number
  serviceCategory: string
  radius: number
}

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResultsData | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearchResults = (results: SearchResultsData) => {
    setSearchResults(results)
    setIsSearching(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Find Local Service Providers
          </h1>
          <p className="text-gray-600">
            Search for nearby providers or create a shout-out if no results are found
          </p>
        </div>

        {/* Search Form */}
        <AdvancedSearch 
          onResults={handleSearchResults}
          defaultLocation=""
        />

        {/* Search Results */}
        {searchResults && (
          <SearchResults
            providers={searchResults.providers}
            total={searchResults.total}
            searchQuery={searchResults.searchQuery}
            location={searchResults.location}
            latitude={searchResults.latitude}
            longitude={searchResults.longitude}
            serviceCategory={searchResults.serviceCategory}
            radius={searchResults.radius}
            loading={isSearching}
          />
        )}
      </div>
    </div>
  )
}

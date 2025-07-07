'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MapAbstractionAIProps {
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void
  className?: string
}

export default function MapAbstractionAI({ onLocationSelect, className = '' }: MapAbstractionAIProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
    address: string
  } | null>(null)

  // Simulated location suggestions based on search
  useEffect(() => {
    if (searchQuery.length > 2) {
      const mockSuggestions = [
        `${searchQuery} - Downtown`,
        `${searchQuery} - North District`,
        `${searchQuery} - South Area`,
        `${searchQuery} - East Side`,
        `${searchQuery} - West End`
      ]
      setSuggestions(mockSuggestions)
    } else {
      setSuggestions([])
    }
  }, [searchQuery])

  const handleLocationSelect = (suggestion: string) => {
    setSearchQuery(suggestion)
    setSuggestions([])
    
    // Simulate geocoding
    const mockLocation = {
      lat: Math.random() * 180 - 90,
      lng: Math.random() * 360 - 180,
      address: suggestion
    }
    
    setSelectedLocation(mockLocation)
    onLocationSelect?.(mockLocation)
  }

  const handleConfirmLocation = () => {
    if (selectedLocation) {
      onLocationSelect?.(selectedLocation)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🗺️</span>
          AI Location Finder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="location-search">What area are you looking for?</Label>
          <Input
            id="location-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g., coffee shops near me, restaurants downtown"
            className="mt-1"
          />
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Suggestions:</Label>
            <div className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleLocationSelect(suggestion)}
                  className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedLocation && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Selected:</strong> {selectedLocation.address}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            </p>
          </div>
        )}

        <Button 
          onClick={handleConfirmLocation}
          disabled={!selectedLocation}
          className="w-full"
        >
          Confirm Location
        </Button>

        <div className="text-xs text-gray-500 text-center">
          🔒 Your exact location is protected until you confirm
        </div>
      </CardContent>
    </Card>
  )
} 
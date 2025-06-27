'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import MapAbstraction from './MapAbstraction'
import AIRadiusScaling from './AIRadiusScaling'

interface MarkerData {
  id: string
  lat: number
  lng: number
  label: string
}

interface MapAbstractionAIProps {
  service: string
  location: string
  markers?: MarkerData[]
  showExact?: boolean
}

export default function MapAbstractionAI({ 
  service, 
  location, 
  markers = [], 
  showExact = false 
}: MapAbstractionAIProps) {
  const [aiRadius, setAIRadius] = useState<number>(5)
  const [isAIRadiusLoaded, setIsAIRadiusLoaded] = useState(false)

  const handleRadiusChange = (radius: number) => {
    setAIRadius(radius)
    setIsAIRadiusLoaded(true)
  }

  return (
    <div className="space-y-6">
      {/* AI Radius Scaling Control Panel */}
      <AIRadiusScaling 
        service={service}
        location={location}
        onRadiusChangeAction={handleRadiusChange}
      />

      {/* Map Display with AI-Recommended Radius */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: isAIRadiusLoaded ? 0.2 : 0 }}
        className="relative"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-white text-xs">🗺️</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Availability Map</h3>
              <p className="text-sm text-gray-500">
                Showing providers with AI-optimized privacy protection
              </p>
            </div>
          </div>
          
          {isAIRadiusLoaded && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700 font-medium">
                AI Radius: {aiRadius} km
              </span>
            </div>
          )}
        </div>

        <MapAbstraction 
          markers={markers}
          showExact={showExact}
          radius={aiRadius}
        />

        {/* Privacy Protection Notice */}
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-sm">🔒</span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Vendor Privacy Protection Active
              </h4>
              <p className="text-sm text-blue-700">
                Providers are shown as availability zones rather than exact locations. 
                This protects their privacy while helping you find nearby services. 
                The blue circles indicate approximate service areas.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Service Information */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Service</span>
            <p className="text-sm font-medium text-gray-900">{service}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Location</span>
            <p className="text-sm font-medium text-gray-900">{location}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Providers Found</span>
            <p className="text-sm font-medium text-gray-900">{markers.length}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Search Radius</span>
            <p className="text-sm font-medium text-gray-900">{aiRadius} km</p>
          </div>
        </div>
      </div>
    </div>
  )
} 
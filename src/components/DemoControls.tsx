'use client';

import { AvailabilityZone, Provider, RadiusZone } from '../types';
import { useEffect, useState } from "react";
import {
  calculateDistance,
  calculateRadiusZone,
  generateAvailabilityDescription,
  generateAvailabilityZones,
} from "../utils/helpers";

interface DemoControlsProps {
  availabilityZones: AvailabilityZone[];
  selectedZone: AvailabilityZone | null;
  setSelectedZone: (zone: AvailabilityZone | null) => void;
  setShowProviderDetails: (show: boolean) => void;
  setSelectedProvider: (provider: Provider | null) => void;
  userLocation: { lat: number; lng: number };
  setUserLocation: (location: { lat: number; lng: number }) => void;
  providers: Provider[];
  currentRadiusZone: RadiusZone | null;
  setCurrentRadiusZone: (zone: RadiusZone | null) => void;
  availableSlots: string[];
  setAvailableSlots: (slots: string[]) => void;
  setAvailabilityZones: (zones: AvailabilityZone[]) => void;
  onInitiateBooking: () => void;
  onShowFeedback: () => void;
}

export default function DemoControls({
  availabilityZones,
  selectedZone,
  setSelectedZone,
  setShowProviderDetails,
  setSelectedProvider,
  userLocation,
  setUserLocation,
  providers,
  currentRadiusZone,
  setCurrentRadiusZone,
  availableSlots,
  setAvailableSlots,
  setAvailabilityZones,
  onInitiateBooking,
  onShowFeedback
}: DemoControlsProps) {

  const handleTestRadius = () => {
    // Simulate different density scenarios
    const scenarios = [
      { lat: 40.7128, lng: -74.0060, name: 'Dense NYC' },
      { lat: 40.7500, lng: -73.9800, name: 'Medium Area' },
      { lat: 40.8000, lng: -73.9500, name: 'Sparse Area' }
    ];
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    setUserLocation({ lat: randomScenario.lat, lng: randomScenario.lng });
    
    // Recalculate radius zone
    const radiusZone = calculateRadiusZone(providers, randomScenario.lat, randomScenario.lng);
    setCurrentRadiusZone(radiusZone);
    const description = generateAvailabilityDescription(radiusZone, providers, {
      lat: randomScenario.lat,
      lng: randomScenario.lng,
    });
    setAvailableSlots([description]);

    // Regenerate availability zones
    const zones = generateAvailabilityZones(providers, radiusZone, {
      lat: randomScenario.lat,
      lng: randomScenario.lng,
    });
    setAvailabilityZones(zones);
    
    // Reset selections
    setSelectedZone(null);
    setShowProviderDetails(false);
    setSelectedProvider(null);
  };

  const handleToggleAbstraction = () => {
    // Toggle between abstracted and detailed view
    setShowProviderDetails(!selectedZone);
    if (!selectedZone) {
      alert('Map abstraction active - provider details hidden until booking');
    } else {
      alert('Showing abstracted provider info - no exact locations revealed');
    }
  };

  const handleDemoBooking = () => {
    // Simulate a complete booking flow
    if (!selectedZone) {
      // Auto-select first zone if none selected
      const firstZone = availabilityZones[0];
      if (firstZone) {
        setSelectedZone(firstZone);
        setTimeout(() => {
          onInitiateBooking();
        }, 500);
      }
    } else {
      onInitiateBooking();
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button 
        onClick={handleTestRadius}
        className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
      >
        Test Radius
      </button>
      
      <button 
        onClick={handleToggleAbstraction}
        className="px-3 py-1 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600 transition-colors"
      >
        Toggle Abstraction
      </button>
      
      <button 
        onClick={handleDemoBooking}
        className="px-3 py-1 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition-colors"
      >
        Demo Booking
      </button>
      
      <button 
        onClick={onShowFeedback}
        className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
      >
        Demo Feedback
      </button>
    </div>
  );
} 

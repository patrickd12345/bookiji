'use client';

import { AvailabilityZone, Provider, RadiusZone } from '../types';
import { useEffect, useState } from "react";

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
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateRadiusZone = (providers: Provider[], lat: number, lng: number): RadiusZone => {
    const nearbyProviders = providers.filter(provider => {
      const distance = calculateDistance(lat, lng, provider.location.lat, provider.location.lng);
      return distance <= 10; // Check within 10km
    });

    if (nearbyProviders.length >= 8) {
      return {
        radius: 2,
        density: 'dense',
        description: 'High provider density - small radius for precision',
        tone: 'specific'
      };
    } else if (nearbyProviders.length >= 4) {
      return {
        radius: 5,
        density: 'medium',
        description: 'Moderate provider density - balanced radius',
        tone: 'balanced'
      };
    } else {
      return {
        radius: 10,
        density: 'sparse',
        description: 'Low provider density - expanded radius for options',
        tone: 'vague'
      };
    }
  };

  const generateAvailabilityDescription = (zone: RadiusZone, providers: Provider[]): string => {
    const nearbyProviders = providers.filter(provider => {
      const distance = calculateDistance(userLocation.lat, userLocation.lng, provider.location.lat, provider.location.lng);
      return distance <= zone.radius;
    });
    
    switch (zone.tone) {
      case 'specific':
        return `${nearbyProviders.length} open slots within ${zone.radius}km`;
      case 'balanced':
        return `Providers near you with live availability`;
      case 'vague':
        return `An opening is available nearby — lock it in to see details`;
      default:
        return `Availability in your area`;
    }
  };

  const generateAvailabilityZones = (providers: Provider[], radiusZone: RadiusZone): AvailabilityZone[] => {
    const nearbyProviders = providers.filter(provider => {
      const distance = calculateDistance(userLocation.lat, userLocation.lng, provider.location.lat, provider.location.lng);
      return distance <= radiusZone.radius;
    });

    const zones: AvailabilityZone[] = [];

    // Group by service category
    const serviceGroups = nearbyProviders.reduce((acc, provider) => {
      const category = provider.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(provider);
      return acc;
    }, {} as Record<string, Provider[]>);

    // Create abstracted service zones
    Object.entries(serviceGroups).forEach(([category, providers]) => {
      const avgDistance = providers.reduce((sum, p) => {
        return sum + calculateDistance(userLocation.lat, userLocation.lng, p.location.lat, p.location.lng);
      }, 0) / providers.length;

      const serviceNames = {
        hair: 'Hair & Beauty',
        wellness: 'Wellness & Massage',
        health: 'Health & Dental',
        fitness: 'Fitness & Training'
      };

      zones.push({
        id: `service-${category}`,
        type: 'service',
        description: `${serviceNames[category as keyof typeof serviceNames]} services`,
        count: providers.length,
        distance: avgDistance,
        abstracted: true
      });
    });

    // Create time-based zones (morning, afternoon, evening)
    const timeZones = [
      { name: 'Morning slots', time: '9 AM - 12 PM', count: Math.floor(nearbyProviders.length * 0.3) },
      { name: 'Afternoon slots', time: '12 PM - 5 PM', count: Math.floor(nearbyProviders.length * 0.4) },
      { name: 'Evening slots', time: '5 PM - 9 PM', count: Math.floor(nearbyProviders.length * 0.3) }
    ];

    timeZones.forEach((timeZone, index) => {
      if (timeZone.count > 0) {
        zones.push({
          id: `time-${index}`,
          type: 'time',
          description: `${timeZone.name} (${timeZone.time})`,
          count: timeZone.count,
          distance: radiusZone.radius / 2,
          abstracted: true
        });
      }
    });

    return zones;
  };

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
    const description = generateAvailabilityDescription(radiusZone, providers);
    setAvailableSlots([description]);
    
    // Regenerate availability zones
    const zones = generateAvailabilityZones(providers, radiusZone);
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
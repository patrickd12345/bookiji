'use client';

import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import type { Zone } from '@/types/global.d';

export default function DemoControls() {
  const {
    userLocation,
    currentRadiusZone,
    selectedZone,
    availabilityZones,
    setUserLocation,
    setCurrentRadiusZone,
    setSelectedZone,
    setAvailabilityZones,
    setShowBookingModal,
  } = useUIStore();

  const handleZoneSelection = (zone: Zone) => {
    setSelectedZone(zone);
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setUserLocation({ lat, lng });
  };

  const handleRadiusChange = (radius: number) => {
    setCurrentRadiusZone(radius);
  };

  const handleZonesUpdate = (zones: Zone[]) => {
    setAvailabilityZones(zones);
    if (zones.length > 0) {
      handleZoneSelection(zones[0]);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2">
      <button
        onClick={() => setShowBookingModal(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Show Booking Modal
      </button>
    </div>
  );
} 

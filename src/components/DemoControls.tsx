'use client';

import React from 'react';
import { useUIStore } from '@/stores/uiStore';

export default function DemoControls() {
  const {
    setShowBookingModal,
  } = useUIStore();

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

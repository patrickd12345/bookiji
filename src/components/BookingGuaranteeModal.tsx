'use client';

import React from 'react';
import { useUIStore } from '@/stores/uiStore';

export default function BookingGuaranteeModal() {
  const { showBookingModal, setShowBookingModal } = useUIStore();

  if (!showBookingModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Commitment + Handoff</h2>
        <p className="text-gray-600 mb-4">
          Bookiji guarantees booking mechanics: commitment and contact handoff. Once the booking is confirmed and contact information is exchanged, Bookiji exits and does not judge service outcomes.
        </p>
        <button
          onClick={() => setShowBookingModal(false)}
          className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          I understand
        </button>
      </div>
    </div>
  );
} 
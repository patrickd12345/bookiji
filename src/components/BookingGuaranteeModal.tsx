'use client';

import React from 'react';
import { useUIStore } from '@/stores/uiStore';

export default function BookingGuaranteeModal() {
  const { showBookingModal, setShowBookingModal } = useUIStore();

  if (!showBookingModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Booking Guarantee</h2>
        <p className="text-gray-600 mb-4">
          Your booking is protected by our $1 guarantee. This ensures both parties show up and helps maintain a reliable booking system.
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
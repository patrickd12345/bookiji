'use client';

import React from 'react';
import { BookijiTour } from '@/lib/guidedTourSimple';

interface TourButtonProps {
  variant?: 'help' | 'start' | 'floating';
  className?: string;
  onStartTour?: () => void;
}

export default function TourButton({ variant = 'help', className = '', onStartTour }: TourButtonProps) {
  const handleStartTour = () => {
    // Start the tour using BookijiTour for backward compatibility
    BookijiTour.resetTour();
    BookijiTour.start();
    
    // Call the parent's tour start handler if provided
    if (onStartTour) {
      onStartTour();
    } else {
      // Fallback: try to trigger tour by dispatching a custom event
      window.dispatchEvent(new CustomEvent('start-bookiji-tour'));
    }
  };

  if (variant === 'floating') {
    return (
      <button
        onClick={handleStartTour}
        className={`fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 ${className}`}
        title="Need help? Start the guided tour!"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  if (variant === 'start') {
    return (
      <button
        onClick={handleStartTour}
        className={`bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 ${className}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Start Guided Tour
      </button>
    );
  }

  return (
    <button
      onClick={handleStartTour}
      className={`text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1 transition-colors ${className}`}
      title="Start the guided tour"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Need Help?
    </button>
  );
} 
'use client';

import React from 'react';

interface BigActionButtonProps {
  onStartTour?: () => void;
}

export default function BigActionButton({ onStartTour }: BigActionButtonProps) {
  const handleClick = () => {
    console.log('🚀 ACTION BUTTON CLICKED - Starting Guided Tour!');
    console.log('🔍 Button props:', { onStartTour: !!onStartTour });
    console.log('🔍 onStartTour type:', typeof onStartTour);
    
    // Start the actual tour
    if (onStartTour) {
      console.log('🎯 Calling onStartTour function');
      try {
        onStartTour();
        console.log('✅ onStartTour called successfully');
      } catch (error) {
        console.error('❌ Error calling onStartTour:', error);
      }
    } else {
      console.log('❌ No onStartTour function provided');
    }
  };

  return (
    <div className="text-center mb-6">
      <button 
        onClick={handleClick}
        className="relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 text-white text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-4 border-yellow-400 animate-bounce"
        style={{
          boxShadow: '0 0 30px rgba(255, 0, 150, 0.6)'
        }}
        title="Click to see Bookiji's amazing features!"
      >
        <span className="mr-3 text-2xl animate-pulse">🚀</span>
        <span className="animate-pulse font-extrabold">See it in ACTION!!!</span>
        <span className="ml-3 text-2xl animate-pulse">⚡</span>
      </button>
    </div>
  );
} 

'use client';

import React from 'react';
import { Zap } from 'lucide-react';

interface BigActionButtonProps {
  onStartTour?: () => void;
}

export default function BigActionButton({ onStartTour }: BigActionButtonProps) {
  const handleClick = () => {
    if (onStartTour) {
      try {
        onStartTour();
      } catch (error) {
        console.error('❌ Error calling onStartTour:', error);
      }
    }
  };

  return (
    <div className="text-center mb-6">
      <style jsx>{`
        @keyframes vibrate {
          0%, 100% { transform: translate(0); }
          25% { transform: translate(-2px, 2px); }
          50% { transform: translate(2px, -2px); }
          75% { transform: translate(-2px, -2px); }
        }
        .vibrate-periodic {
          animation: vibrate 0.3s ease-in-out;
          animation-iteration-count: infinite;
          animation-play-state: running;
          animation-delay: 0s;
          animation-duration: 3s;
        }
      `}</style>
      <button 
        onClick={handleClick}
        className="relative inline-flex items-center gap-3 px-8 py-4 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 vibrate-periodic hover:opacity-90 bg-gradient-to-r from-primary to-accent"
        style={{
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
        title="Explore Bookiji features"
      >
        <Zap className="w-6 h-6" />
        <span className="font-extrabold">See it in ACTION!</span>
        <Zap className="w-6 h-6" />
      </button>
    </div>
  );
} 

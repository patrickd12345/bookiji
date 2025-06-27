'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LLMQuoteGeneratorProps {
  className?: string;
}

export default function LLMQuoteGenerator({ className = '' }: LLMQuoteGeneratorProps) {
  const [quote, setQuote] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set the fixed quote after a brief loading state for smooth animation
    const timer = setTimeout(() => {
      setQuote("I have been invited to a wedding Saturday. I need a haircut appointment before Friday night");
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`text-center ${className}`}>
      <motion.div
        key={quote}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {isLoading ? (
          <div className="text-2xl font-bold text-gray-400 animate-pulse">
            Loading...
          </div>
        ) : (
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            "{quote}"
          </h2>
        )}
      </motion.div>
    </div>
  );
} 
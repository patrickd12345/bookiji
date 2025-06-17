'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AIResponse } from '../types';

interface AIConversationalInterfaceProps {
  aiResponses: AIResponse[];
  setAiResponses: (responses: AIResponse[] | ((prev: AIResponse[]) => AIResponse[])) => void;
  isAiActive: boolean;
  setIsAiActive: (active: boolean) => void;
}

export default function AIConversationalInterface({
  aiResponses,
  setAiResponses,
  isAiActive,
  setIsAiActive
}: AIConversationalInterfaceProps) {
  const [aiInput, setAiInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [messageId, setMessageId] = useState<string>("");

  useEffect(() => {
    setMessageId(Date.now().toString());
  }, []);

  const handleAISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    // Add user message
    const userMessage: AIResponse = {
      id: messageId,
      message: aiInput,
      timestamp: new Date(),
      type: 'user'
    };

    setAiResponses([...aiResponses, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: AIResponse = {
        id: messageId,
        message: generateAIResponse(aiInput),
        timestamp: new Date(),
        type: 'ai'
      };
      setAiResponses((prev: AIResponse[]) => [...prev, aiMessage]);
    }, 1000);

    setAiInput('');
  };

  const generateAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('massage') || lowerInput.includes('wellness')) {
      return "I found 3 wellness providers near you with availability today. Would you like to see massage options or other wellness services?";
    } else if (lowerInput.includes('hair') || lowerInput.includes('beauty')) {
      return "Great! I see 5 hair and beauty providers in your area. What type of service are you looking for?";
    } else if (lowerInput.includes('time') || lowerInput.includes('when')) {
      return "I can help you find available slots. What time works best for you today?";
    } else {
      return "I can help you find available providers near you. What type of service are you looking for?";
    }
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    // In real app, this would integrate with speech recognition
    setTimeout(() => {
      setIsListening(false);
      setAiInput("I need a massage near me at 6 PM");
    }, 2000);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm">🤖</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">AI Booking Assistant</h3>
      </div>

      {/* AI Responses */}
      {aiResponses.length > 0 && (
        <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
          {aiResponses.map((response) => (
            <motion.div
              key={response.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg ${
                response.type === 'user'
                  ? 'bg-blue-100 ml-8'
                  : 'bg-gray-100 mr-8'
              }`}
            >
              <div className="text-sm text-gray-800">{response.message}</div>
              <div className="text-xs text-gray-500 mt-1">
                {response.timestamp.toLocaleTimeString()}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* AI Input */}
      <form onSubmit={handleAISubmit} className="flex space-x-2">
        <input
          type="text"
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          placeholder="Try: 'Massage near me at 6 PM'"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={toggleListening}
          className={`px-3 py-2 rounded-lg transition-colors ${
            isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          {isListening ? '🎤' : '🎤'}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Send
        </button>
      </form>

      {/* Quick Suggestions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {['Massage near me', 'Hair appointment today', 'Wellness services', 'Available now'].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setAiInput(suggestion)}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
} 
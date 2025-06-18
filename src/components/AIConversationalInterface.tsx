'use client';

import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import type { AIResponse } from '@/types/global.d';

export default function AIConversationalInterface() {
  const { aiResponses } = useUIStore();

  return (
    <div className="flex flex-col space-y-4 p-4">
      {aiResponses.map((response: AIResponse, index: number) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-800">{response.message}</p>
        </div>
      ))}
    </div>
  );
} 

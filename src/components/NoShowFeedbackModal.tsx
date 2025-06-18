'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';

export default function NoShowFeedbackModal() {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    showFeedbackModal,
    currentAppointment,
    setShowFeedbackModal,
    setCurrentAppointment
  } = useUIStore();

  if (!showFeedbackModal || !currentAppointment) return null;

  const handleSubmitFeedback = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update appointment status and feedback
    const updatedAppointment = {
      ...currentAppointment,
      status: 'cancelled' as const,
      feedback
    };
    
    setCurrentAppointment(updatedAppointment);
    setShowFeedbackModal(false);
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl">📝</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">No-Show Feedback</h2>
          <p className="text-gray-600 mt-2">
            Help us improve by sharing what happened
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
              What went wrong?
            </label>
            <textarea
              id="feedback"
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Please share your experience..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowFeedbackModal(false)}
            className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitFeedback}
            disabled={isSubmitting || !feedback.trim()}
            className={`flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl 
              ${(isSubmitting || !feedback.trim()) ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'} transition-opacity`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
} 
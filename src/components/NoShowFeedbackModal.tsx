'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Appointment } from '../types';

interface NoShowFeedbackModalProps {
  showFeedbackModal: boolean;
  setShowFeedbackModal: (show: boolean) => void;
  currentAppointment: Appointment | null;
  setCurrentAppointment: (appointment: Appointment | null) => void;
  feedbackStep: 'question' | 'rating' | 'complete';
  setFeedbackStep: (step: 'question' | 'rating' | 'complete') => void;
}

export default function NoShowFeedbackModal({
  showFeedbackModal,
  setShowFeedbackModal,
  currentAppointment,
  setCurrentAppointment,
  feedbackStep,
  setFeedbackStep
}: NoShowFeedbackModalProps) {
  const handleNoShow = () => {
    if (currentAppointment) {
      const updatedAppointment = { ...currentAppointment, status: 'no-show' as const };
      setCurrentAppointment(updatedAppointment);
    }
    setFeedbackStep('complete');
  };

  const handleShowUp = () => {
    setFeedbackStep('rating');
  };

  const handleRating = (rating: number) => {
    if (currentAppointment) {
      const updatedAppointment = { 
        ...currentAppointment, 
        status: 'completed' as const,
        rating 
      };
      setCurrentAppointment(updatedAppointment);
    }
    setFeedbackStep('complete');
  };

  const handleComplete = () => {
    setShowFeedbackModal(false);
    setFeedbackStep('question');
    setCurrentAppointment(null);
  };

  return (
    <AnimatePresence>
      {showFeedbackModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
          >
            <div className="text-center">
              {feedbackStep === 'question' && (
                <div>
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-2xl">❓</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Did your appointment take place?</h2>
                  <p className="text-gray-600 mb-6">Help us maintain quality by confirming your experience</p>
                  
                  <div className="space-y-3">
                    <button
                      onClick={handleShowUp}
                      className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      ✅ Yes, I attended
                    </button>
                    <button
                      onClick={handleNoShow}
                      className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      ❌ No, I didn't show up
                    </button>
                  </div>
                </div>
              )}

              {feedbackStep === 'rating' && (
                <div>
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-2xl">⭐</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Rate your experience</h2>
                  <p className="text-gray-600 mb-6">How was your appointment with the provider?</p>
                  
                  <div className="flex justify-center space-x-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRating(star)}
                        className="text-3xl hover:scale-110 transition-transform"
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Click a star to rate your experience
                  </div>
                </div>
              )}

              {feedbackStep === 'complete' && (
                <div>
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-2xl">✅</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Thank you!</h2>
                  <p className="text-gray-600 mb-6">
                    {currentAppointment?.status === 'no-show' 
                      ? 'We\'ve noted the no-show. This helps us maintain quality for all users.'
                      : 'Your feedback helps us maintain quality and helps other users make informed decisions.'
                    }
                  </p>
                  
                  <button
                    onClick={handleComplete}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 
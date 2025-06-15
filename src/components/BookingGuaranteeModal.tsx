'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { BookingGuarantee, Provider } from '../types';

interface BookingGuaranteeModalProps {
  showBookingModal: boolean;
  setShowBookingModal: (show: boolean) => void;
  bookingGuarantee: BookingGuarantee;
  setBookingGuarantee: (guarantee: BookingGuarantee) => void;
  selectedProvider: Provider | null;
  selectedSlot: string | null;
  onProcessCustomerCommitment: () => void;
  onCompleteBooking: () => void;
  onCancelBooking: () => void;
}

export default function BookingGuaranteeModal({
  showBookingModal,
  setShowBookingModal,
  bookingGuarantee,
  setBookingGuarantee,
  selectedProvider,
  selectedSlot,
  onProcessCustomerCommitment,
  onCompleteBooking,
  onCancelBooking
}: BookingGuaranteeModalProps) {
  return (
    <AnimatePresence>
      {showBookingModal && (
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
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">🔒</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Guarantee</h2>
              
              {/* Booking Steps */}
              <div className="space-y-3 mb-6">
                <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                  bookingGuarantee.customerCommitted ? 'bg-green-100 border border-green-300' : 'bg-gray-100'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                    bookingGuarantee.customerCommitted ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {bookingGuarantee.customerCommitted ? '✓' : '1'}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Customer Commitment</div>
                    <div className="text-sm text-gray-600">$1 fee locks your booking</div>
                  </div>
                </div>
                
                <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                  bookingGuarantee.vendorPaid ? 'bg-green-100 border border-green-300' : 'bg-gray-100'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                    bookingGuarantee.vendorPaid ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {bookingGuarantee.vendorPaid ? '✓' : '2'}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Vendor Payment</div>
                    <div className="text-sm text-gray-600">Provider pays upfront fee</div>
                  </div>
                </div>
                
                <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                  bookingGuarantee.slotLocked ? 'bg-green-100 border border-green-300' : 'bg-gray-100'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                    bookingGuarantee.slotLocked ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {bookingGuarantee.slotLocked ? '✓' : '3'}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Slot Locked</div>
                    <div className="text-sm text-gray-600">No second confirmation needed</div>
                  </div>
                </div>
                
                <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                  bookingGuarantee.providerDetailsRevealed ? 'bg-green-100 border border-green-300' : 'bg-gray-100'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                    bookingGuarantee.providerDetailsRevealed ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {bookingGuarantee.providerDetailsRevealed ? '✓' : '4'}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Details Revealed</div>
                    <div className="text-sm text-gray-600">Provider info now available</div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              {!bookingGuarantee.customerCommitted ? (
                <div className="space-y-3">
                  <button
                    onClick={onProcessCustomerCommitment}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Pay $1 to Lock Booking
                  </button>
                  <button
                    onClick={onCancelBooking}
                    className="w-full py-2 text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : bookingGuarantee.providerDetailsRevealed ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium text-green-800">Booking Confirmed!</div>
                    <div className="text-sm text-green-600">
                      {selectedProvider?.name} - {selectedProvider?.service}
                    </div>
                  </div>
                  <button
                    onClick={onCompleteBooking}
                    className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Complete Booking
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <div className="text-sm text-gray-600">Processing booking...</div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 
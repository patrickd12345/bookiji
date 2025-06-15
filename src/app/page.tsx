'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Import types
import { 
  Provider, 
  BookingSlot, 
  Persona, 
  AIResponse, 
  Appointment, 
  RadiusZone, 
  AvailabilityZone, 
  BookingGuarantee 
} from '../types';

// Import components
import {
  AIConversationalInterface,
  CustomerPersonaSelector,
  NoShowFeedbackModal,
  MapAbstraction,
  BookingGuaranteeModal,
  FeatureSummary,
  DemoControls
} from '../components';

// Import utilities and data
import { 
  calculateRadiusZone, 
  generateAvailabilityDescription, 
  generateAvailabilityZones 
} from '../utils/helpers';
import { providers, bookingSlots, personas } from '../data/mockData';

export default function Home() {
  // Core state
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState({ lat: 40.7128, lng: -74.0060 });
  
  // AI Conversational Interface State
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [isAiActive, setIsAiActive] = useState(false);
  
  // Customer Persona System State
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [showPersonaSelector, setShowPersonaSelector] = useState(true);
  
  // No-Show Flag System State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [feedbackStep, setFeedbackStep] = useState<'question' | 'rating' | 'complete'>('question');
  
  // AI Radius Scaling System State
  const [currentRadiusZone, setCurrentRadiusZone] = useState<RadiusZone | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  // Map Abstraction Layer State
  const [availabilityZones, setAvailabilityZones] = useState<AvailabilityZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<AvailabilityZone | null>(null);
  const [showProviderDetails, setShowProviderDetails] = useState(false);
  
  // Booking Guarantee System State
  const [bookingGuarantee, setBookingGuarantee] = useState<BookingGuarantee>({
    customerCommitted: false,
    vendorPaid: false,
    slotLocked: false,
    providerDetailsRevealed: false
  });
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Initialize location and radius calculations
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          
          // Calculate AI radius zone based on provider density
          const radiusZone = calculateRadiusZone(providers, newLocation.lat, newLocation.lng);
          setCurrentRadiusZone(radiusZone);
          
          // Generate availability description
          const description = generateAvailabilityDescription(radiusZone, providers, newLocation);
          setAvailableSlots([description]);
          
          // Generate abstracted availability zones
          const zones = generateAvailabilityZones(providers, radiusZone, newLocation);
          setAvailabilityZones(zones);
        },
        () => {
          // Default to NYC if location access denied
          console.log('Location access denied, using default');
          const radiusZone = calculateRadiusZone(providers, userLocation.lat, userLocation.lng);
          setCurrentRadiusZone(radiusZone);
          const description = generateAvailabilityDescription(radiusZone, providers, userLocation);
          setAvailableSlots([description]);
          
          // Generate abstracted availability zones
          const zones = generateAvailabilityZones(providers, radiusZone, userLocation);
          setAvailabilityZones(zones);
        }
      );
    } else {
      // Fallback for browsers without geolocation
      const radiusZone = calculateRadiusZone(providers, userLocation.lat, userLocation.lng);
      setCurrentRadiusZone(radiusZone);
      const description = generateAvailabilityDescription(radiusZone, providers, userLocation);
      setAvailableSlots([description]);
      
      // Generate abstracted availability zones
      const zones = generateAvailabilityZones(providers, radiusZone, userLocation);
      setAvailabilityZones(zones);
    }
  }, []);

  // Booking Guarantee Logic Functions
  const initiateBooking = () => {
    if (!selectedZone || !selectedProvider) return;
    setShowBookingModal(true);
  };

  const processCustomerCommitment = () => {
    // Step 1: Customer pays $1 commitment fee
    setBookingGuarantee(prev => ({ ...prev, customerCommitted: true }));
    
    // Step 2: Vendor pays upfront fee (automatic)
    setTimeout(() => {
      setBookingGuarantee(prev => ({ ...prev, vendorPaid: true }));
      
      // Step 3: Slot is locked (no second confirmation needed)
      setTimeout(() => {
        setBookingGuarantee(prev => ({ ...prev, slotLocked: true }));
        
        // Step 4: Provider details revealed
        setTimeout(() => {
          setBookingGuarantee(prev => ({ ...prev, providerDetailsRevealed: true }));
        }, 1000);
      }, 1000);
    }, 1000);
  };

  const completeBooking = () => {
    setShowBookingModal(false);
    setBookingGuarantee({
      customerCommitted: false,
      vendorPaid: false,
      slotLocked: false,
      providerDetailsRevealed: false
    });
    
    // In real app, this would create the appointment
    alert(`Booking confirmed! ${selectedProvider?.name} at ${selectedSlot?.time || 'selected time'}. Provider details and contact info now available.`);
  };

  const cancelBooking = () => {
    setShowBookingModal(false);
    setBookingGuarantee({
      customerCommitted: false,
      vendorPaid: false,
      slotLocked: false,
      providerDetailsRevealed: false
    });
  };

  const handleShowFeedback = () => {
    setCurrentAppointment({
      id: 'demo-appointment',
      providerId: '1',
      customerId: 'user-1',
      time: '2:00 PM',
      status: 'scheduled'
    });
    setShowFeedbackModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Customer Persona Selector */}
      <CustomerPersonaSelector
        showPersonaSelector={showPersonaSelector}
        setShowPersonaSelector={setShowPersonaSelector}
        selectedPersona={selectedPersona}
        setSelectedPersona={setSelectedPersona}
      />

      {/* No-Show Feedback Modal */}
      <NoShowFeedbackModal
        showFeedbackModal={showFeedbackModal}
        setShowFeedbackModal={setShowFeedbackModal}
        currentAppointment={currentAppointment}
        setCurrentAppointment={setCurrentAppointment}
        feedbackStep={feedbackStep}
        setFeedbackStep={setFeedbackStep}
      />

      {/* Booking Guarantee Modal */}
      <BookingGuaranteeModal
        showBookingModal={showBookingModal}
        setShowBookingModal={setShowBookingModal}
        bookingGuarantee={bookingGuarantee}
        setBookingGuarantee={setBookingGuarantee}
        selectedProvider={selectedProvider}
        selectedSlot={selectedSlot?.time || null}
        onProcessCustomerCommitment={processCustomerCommitment}
        onCompleteBooking={completeBooking}
        onCancelBooking={cancelBooking}
      />

      {/* Main Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🎯 Bookiji</h1>
          <p className="text-gray-600">Real-time booking engine with guaranteed appointments</p>
        </div>

        {/* Three-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Map */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🗺️ Map & Availability</h2>
              
              <MapAbstraction
                availabilityZones={availabilityZones}
                selectedZone={selectedZone}
                setSelectedZone={setSelectedZone}
                showProviderDetails={showProviderDetails}
                setShowProviderDetails={setShowProviderDetails}
                selectedProvider={selectedProvider}
                setSelectedProvider={setSelectedProvider}
                currentRadiusZone={currentRadiusZone}
                availableSlots={availableSlots}
                providers={providers}
                userLocation={userLocation}
                onBookZone={initiateBooking}
              />

              {/* Demo Controls */}
              <DemoControls
                availabilityZones={availabilityZones}
                selectedZone={selectedZone}
                setSelectedZone={setSelectedZone}
                setShowProviderDetails={setShowProviderDetails}
                setSelectedProvider={setSelectedProvider}
                userLocation={userLocation}
                setUserLocation={setUserLocation}
                providers={providers}
                currentRadiusZone={currentRadiusZone}
                setCurrentRadiusZone={setCurrentRadiusZone}
                availableSlots={availableSlots}
                setAvailableSlots={setAvailableSlots}
                setAvailabilityZones={setAvailabilityZones}
                onInitiateBooking={initiateBooking}
                onShowFeedback={handleShowFeedback}
              />

              {/* Feature Summary */}
              <FeatureSummary />
            </div>
          </div>

          {/* Center Panel - AI Interface */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">💬 AI Assistant</h2>
              
              <AIConversationalInterface
                aiResponses={aiResponses}
                setAiResponses={setAiResponses}
                isAiActive={isAiActive}
                setIsAiActive={setIsAiActive}
              />

              {/* Selected Persona Display */}
              {selectedPersona && (
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{selectedPersona.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{selectedPersona.name}</div>
                      <div className="text-sm text-gray-600">{selectedPersona.description}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Booking */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📅 Booking</h2>
              
              {selectedProvider ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Selected Provider</h3>
                    <div className="text-sm text-gray-600">
                      <div><strong>Name:</strong> {selectedProvider.name}</div>
                      <div><strong>Service:</strong> {selectedProvider.service}</div>
                      <div><strong>Rating:</strong> {selectedProvider.rating} ⭐</div>
                      <div><strong>Price:</strong> {selectedProvider.price}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Available Slots</h4>
                    {bookingSlots
                      .filter(slot => slot.providerId === selectedProvider.id)
                      .map(slot => (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot)}
                          className={`w-full p-3 rounded-lg border transition-colors ${
                            selectedSlot?.id === slot.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                  </div>

                  {selectedSlot && (
                    <button
                      onClick={initiateBooking}
                      className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Book {selectedProvider.service} at {selectedSlot.time} - $1 commitment
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-4">🎯</div>
                  <p>Select a provider from the map to start booking</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
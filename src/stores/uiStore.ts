import { create } from 'zustand';
import type { AIResponse, Persona, Provider, Zone, Appointment } from '@/types/global.d';

interface Location {
  lat: number;
  lng: number;
}

interface UIState {
  // User and Persona
  currentPersona: Persona | null;
  selectedPersona: Persona | null;
  showPersonaSelector: boolean;
  setCurrentPersona: (persona: Persona | null) => void;
  setSelectedPersona: (persona: Persona | null) => void;
  setShowPersonaSelector: (show: boolean) => void;

  // AI Chat
  aiResponses: AIResponse[];
  isAiActive: boolean;
  addAIResponse: (response: AIResponse) => void;
  setAiResponses: (responses: AIResponse[]) => void;
  setIsAiActive: (active: boolean) => void;
  clearAIResponses: () => void;

  // Map and Zones
  selectedZone: Zone | null;
  showProviderDetails: boolean;
  selectedProvider: Provider | null;
  userLocation: Location | null;
  currentRadiusZone: number;
  availableSlots: number;
  availabilityZones: Zone[];
  providers: Provider[];
  setSelectedZone: (zone: Zone | null) => void;
  setShowProviderDetails: (show: boolean) => void;
  setSelectedProvider: (provider: Provider | null) => void;
  setUserLocation: (location: Location | null) => void;
  setCurrentRadiusZone: (radius: number) => void;
  setAvailableSlots: (slots: number) => void;
  setAvailabilityZones: (zones: Zone[]) => void;
  setProviders: (providers: Provider[]) => void;

  // Modals
  showRegistration: boolean;
  showBookingModal: boolean;
  showFeedbackModal: boolean;
  showAdminCockpit: boolean;
  bookingGuarantee: boolean;
  setShowRegistration: (show: boolean) => void;
  setShowBookingModal: (show: boolean) => void;
  setShowFeedbackModal: (show: boolean) => void;
  setShowAdminCockpit: (show: boolean) => void;
  setBookingGuarantee: (guarantee: boolean) => void;

  // Appointments
  currentAppointment: Appointment | null;
  setCurrentAppointment: (appointment: Appointment | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // User and Persona
  currentPersona: null,
  selectedPersona: null,
  showPersonaSelector: false,
  setCurrentPersona: (persona) => set({ currentPersona: persona }),
  setSelectedPersona: (persona) => set({ selectedPersona: persona }),
  setShowPersonaSelector: (show) => set({ showPersonaSelector: show }),

  // AI Chat
  aiResponses: [],
  isAiActive: false,
  addAIResponse: (response) => set((state) => ({ aiResponses: [...state.aiResponses, response] })),
  setAiResponses: (responses) => set({ aiResponses: responses }),
  setIsAiActive: (active) => set({ isAiActive: active }),
  clearAIResponses: () => set({ aiResponses: [] }),

  // Map and Zones
  selectedZone: null,
  showProviderDetails: false,
  selectedProvider: null,
  userLocation: null,
  currentRadiusZone: 5,
  availableSlots: 0,
  availabilityZones: [],
  providers: [],
  setSelectedZone: (zone) => set({ selectedZone: zone }),
  setShowProviderDetails: (show) => set({ showProviderDetails: show }),
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setUserLocation: (location) => set({ userLocation: location }),
  setCurrentRadiusZone: (radius) => set({ currentRadiusZone: radius }),
  setAvailableSlots: (slots) => set({ availableSlots: slots }),
  setAvailabilityZones: (zones) => set({ availabilityZones: zones }),
  setProviders: (providers) => set({ providers: providers }),

  // Modals
  showRegistration: false,
  showBookingModal: false,
  showFeedbackModal: false,
  showAdminCockpit: false,
  bookingGuarantee: false,
  setShowRegistration: (show) => set({ showRegistration: show }),
  setShowBookingModal: (show) => set({ showBookingModal: show }),
  setShowFeedbackModal: (show) => set({ showFeedbackModal: show }),
  setShowAdminCockpit: (show) => set({ showAdminCockpit: show }),
  setBookingGuarantee: (guarantee) => set({ bookingGuarantee: guarantee }),

  // Appointments
  currentAppointment: null,
  setCurrentAppointment: (appointment) => set({ currentAppointment: appointment })
})); 
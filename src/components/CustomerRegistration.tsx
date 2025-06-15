'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RegistrationForm, Persona } from '../types';

interface CustomerRegistrationProps {
  showRegistration: boolean;
  setShowRegistration: (show: boolean) => void;
  onRegister: (formData: RegistrationForm) => void;
  personas: Persona[];
}

export default function CustomerRegistration({
  showRegistration,
  setShowRegistration,
  onRegister,
  personas
}: CustomerRegistrationProps) {
  const [formData, setFormData] = useState<RegistrationForm>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    role: 'customer',
    agreeToTerms: false,
    marketingConsent: false
  });

  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [step, setStep] = useState<'basic' | 'persona' | 'complete'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      setStep('persona');
    }
  };

  const handleBack = () => {
    setStep('basic');
  };

  const handleComplete = () => {
    if (selectedPersona) {
      onRegister({
        ...formData,
        preferences: { persona: selectedPersona.id }
      });
      setStep('complete');
    }
  };

  const handleSkipPersona = () => {
    onRegister(formData);
    setStep('complete');
  };

  const handleClose = () => {
    setShowRegistration(false);
    setStep('basic');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: '',
      role: 'customer',
      agreeToTerms: false,
      marketingConsent: false
    });
    setSelectedPersona(null);
    setErrors({});
  };

  return (
    <AnimatePresence>
      {showRegistration && (
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
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">👤</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Bookiji</h2>
              <p className="text-gray-600">Create your account to start booking</p>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  step === 'basic' ? 'bg-blue-500 text-white' : 
                  step === 'persona' ? 'bg-green-500 text-white' : 'bg-gray-300'
                }`}>
                  {step === 'basic' ? '1' : '✓'}
                </div>
                <div className="w-8 h-1 bg-gray-300"></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  step === 'persona' ? 'bg-blue-500 text-white' : 
                  step === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-300'
                }`}>
                  {step === 'complete' ? '✓' : '2'}
                </div>
              </div>
            </div>

            {step === 'basic' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Create a password"
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      I agree to the <a href="#" className="text-blue-500 hover:underline">Terms of Service</a> and{' '}
                      <a href="#" className="text-blue-500 hover:underline">Privacy Policy</a> *
                    </span>
                  </label>
                  {errors.agreeToTerms && <p className="text-red-500 text-xs">{errors.agreeToTerms}</p>}

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.marketingConsent}
                      onChange={(e) => setFormData({ ...formData, marketingConsent: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      I'd like to receive updates and promotional emails
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Continue
                </button>
              </motion.div>
            )}

            {step === 'persona' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Your Style</h3>
                  <p className="text-gray-600">Select a persona to personalize your experience (optional)</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {personas.map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersona(persona)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        selectedPersona?.id === persona.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{persona.icon}</div>
                      <div className="font-medium text-gray-900 text-sm">{persona.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{persona.description}</div>
                    </button>
                  ))}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSkipPersona}
                    className="flex-1 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={!selectedPersona}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                  >
                    Complete
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">✓</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to Bookiji!</h3>
                <p className="text-gray-600 mb-6">
                  Your account has been created successfully. You can now start booking appointments.
                </p>
                <button
                  onClick={handleClose}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Get Started
                </button>
              </motion.div>
            )}

            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 
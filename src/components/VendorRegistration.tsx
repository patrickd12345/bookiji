'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VendorRegistrationForm, VendorService, BusinessHours } from '../types';

interface VendorRegistrationProps {
  showRegistration: boolean;
  setShowRegistration: (show: boolean) => void;
  onRegister: (formData: VendorRegistrationForm) => void;
}

const defaultBusinessHours: BusinessHours = {
  monday: { open: '09:00', close: '17:00', isOpen: true },
  tuesday: { open: '09:00', close: '17:00', isOpen: true },
  wednesday: { open: '09:00', close: '17:00', isOpen: true },
  thursday: { open: '09:00', close: '17:00', isOpen: true },
  friday: { open: '09:00', close: '17:00', isOpen: true },
  saturday: { open: '10:00', close: '16:00', isOpen: true },
  sunday: { open: '10:00', close: '16:00', isOpen: false }
};

const serviceCategories = [
  { id: 'hair', name: 'Hair & Beauty', icon: '💇' },
  { id: 'wellness', name: 'Wellness & Massage', icon: '🧘' },
  { id: 'health', name: 'Health & Dental', icon: '🦷' },
  { id: 'fitness', name: 'Fitness & Training', icon: '💪' }
];

export default function VendorRegistration({
  showRegistration,
  setShowRegistration,
  onRegister
}: VendorRegistrationProps) {
  const [formData, setFormData] = useState<VendorRegistrationForm>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    role: 'vendor',
    agreeToTerms: false,
    marketingConsent: false,
    businessName: '',
    businessType: 'individual',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    services: [],
    businessHours: defaultBusinessHours
  });

  const [step, setStep] = useState<'basic' | 'business' | 'services' | 'hours' | 'complete'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newService, setNewService] = useState<Partial<VendorService>>({
    name: '',
    category: 'hair',
    price: 0,
    duration: 60,
    description: '',
    isActive: true
  });

  const validateBasicForm = (): boolean => {
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

  const validateBusinessForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName) newErrors.businessName = 'Business name is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.zipCode) newErrors.zipCode = 'ZIP code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateServicesForm = (): boolean => {
    if (formData.services.length === 0) {
      setErrors({ services: 'At least one service is required' });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 'basic' && validateBasicForm()) {
      setStep('business');
    } else if (step === 'business' && validateBusinessForm()) {
      setStep('services');
    } else if (step === 'services' && validateServicesForm()) {
      setStep('hours');
    } else if (step === 'hours') {
      onRegister(formData);
      setStep('complete');
    }
  };

  const handleBack = () => {
    if (step === 'business') setStep('basic');
    else if (step === 'services') setStep('business');
    else if (step === 'hours') setStep('services');
  };

  const handleAddService = () => {
    if (newService.name && newService.price && newService.duration) {
      const service: VendorService = {
        id: Date.now().toString(),
        name: newService.name,
        category: newService.category as 'hair' | 'wellness' | 'health' | 'fitness',
        price: newService.price,
        duration: newService.duration,
        description: newService.description || '',
        isActive: true
      };
      setFormData({ ...formData, services: [...formData.services, service] });
      setNewService({
        name: '',
        category: 'hair',
        price: 0,
        duration: 60,
        description: '',
        isActive: true
      });
    }
  };

  const handleRemoveService = (serviceId: string) => {
    setFormData({
      ...formData,
      services: formData.services.filter(service => service.id !== serviceId)
    });
  };

  const handleUpdateBusinessHours = (day: keyof BusinessHours, field: 'open' | 'close' | 'isOpen', value: string | boolean) => {
    setFormData({
      ...formData,
      businessHours: {
        ...formData.businessHours,
        [day]: {
          ...formData.businessHours[day],
          [field]: value
        }
      }
    });
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
      role: 'vendor',
      agreeToTerms: false,
      marketingConsent: false,
      businessName: '',
      businessType: 'individual',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      services: [],
      businessHours: defaultBusinessHours
    });
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
            className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">🏢</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Join as a Vendor</h2>
              <p className="text-gray-600">Set up your business profile to start accepting bookings</p>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-2">
                {['basic', 'business', 'services', 'hours', 'complete'].map((stepName, index) => (
                  <div key={stepName} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      step === stepName ? 'bg-blue-500 text-white' : 
                      ['basic', 'business', 'services', 'hours'].indexOf(step) > index ? 'bg-green-500 text-white' : 'bg-gray-300'
                    }`}>
                      {['basic', 'business', 'services', 'hours'].indexOf(step) > index ? '✓' : index + 1}
                    </div>
                    {index < 4 && <div className="w-4 h-1 bg-gray-300 mx-1"></div>}
                  </div>
                ))}
              </div>
            </div>

            {step === 'basic' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
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

            {step === 'business' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.businessName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your business name"
                  />
                  {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value as 'individual' | 'company' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="individual">Individual/Sole Proprietor</option>
                    <option value="company">Company/Corporation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your business address"
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="City"
                    />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="State"
                    />
                    {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.zipCode ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="ZIP Code"
                    />
                    {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'services' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Your Services</h3>
                  <p className="text-gray-600">Add the services you offer to customers</p>
                </div>

                {/* Add New Service Form */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Add New Service</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                      <input
                        type="text"
                        value={newService.name}
                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Haircut, Massage"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={newService.category}
                        onChange={(e) => setNewService({ ...newService, category: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {serviceCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                      <input
                        type="number"
                        value={newService.price}
                        onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        value={newService.duration}
                        onChange={(e) => setNewService({ ...newService, duration: parseInt(e.target.value) || 60 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="60"
                        min="15"
                        step="15"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of the service"
                      rows={2}
                    />
                  </div>
                  <button
                    onClick={handleAddService}
                    className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Add Service
                  </button>
                </div>

                {/* Services List */}
                {formData.services.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Your Services</h4>
                    <div className="space-y-2">
                      {formData.services.map(service => (
                        <div key={service.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">{service.name}</div>
                            <div className="text-sm text-gray-600">
                              ${service.price} • {service.duration} min • {serviceCategories.find(cat => cat.id === service.category)?.name}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveService(service.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errors.services && <p className="text-red-500 text-xs">{errors.services}</p>}

                <div className="flex space-x-3">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'hours' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Hours</h3>
                  <p className="text-gray-600">Set your availability for each day of the week</p>
                </div>

                <div className="space-y-3">
                  {Object.entries(formData.businessHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-20">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={hours.isOpen}
                            onChange={(e) => handleUpdateBusinessHours(day as keyof BusinessHours, 'isOpen', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium capitalize">{day}</span>
                        </label>
                      </div>
                      {hours.isOpen && (
                        <>
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => handleUpdateBusinessHours(day as keyof BusinessHours, 'open', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => handleUpdateBusinessHours(day as keyof BusinessHours, 'close', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </>
                      )}
                    </div>
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
                    onClick={handleNext}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Complete Registration
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
                  Your vendor account has been created successfully. Our team will review your application and verify your business details within 24-48 hours.
                </p>
                <button
                  onClick={handleClose}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Continue
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
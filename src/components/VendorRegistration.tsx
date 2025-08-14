'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  User, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';


interface VendorFormData {
  // Business Information
  business_name: string;
  business_description: string;
  business_type: string;
  service_categories: string[];
  
  // Contact Information
  contact_name: string;
  email: string;
  phone: string;
  website?: string;
  
  // Location & Service Area
  business_address: string;
  city: string;
  state: string;
  zip_code: string;
  service_radius: number;
  mobile_service: boolean;
  
  // Services & Pricing
  services: ServiceOffering[];
  
  // Business Details
  years_in_business: number;
  license_number?: string;
  insurance_verified: boolean;
  
  // Availability
  operating_hours: WeeklyHours;
  advance_booking_days: number;
  
  // Marketing
  marketing_consent: boolean;
  referral_source: string;
}

interface ServiceOffering {
  id: string;
  name: string;
  description: string;
  category: string;
  duration_minutes: number;
  price_cents: number;
  deposit_required: boolean;
  deposit_percentage?: number;
}

interface WeeklyHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface DayHours {
  open: boolean;
  start_time: string;
  end_time: string;
  breaks: { start: string; end: string }[];
}

interface ValidationErrors {
  [key: string]: string;
}

const defaultDayHours: DayHours = {
  open: true,
  start_time: '09:00',
  end_time: '17:00',
  breaks: []
};

const serviceCategories = [
  'Beauty & Wellness',
  'Hair & Styling',
  'Nails & Spa',
  'Massage & Therapy',
  'Fitness & Training',
  'Home Services',
  'Cleaning & Maintenance',
  'Repairs & Installation',
  'Professional Services',
  'Consulting',
  'Tutoring & Education',
  'Creative Services',
  'Photography & Video',
  'Event Services',
  'Automotive',
  'Pet Services',
  'Health & Medical',
  'Other'
];

export default function VendorRegistration({ onSuccess }: { onSuccess?: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<VendorFormData>({
    business_name: '',
    business_description: '',
    business_type: '',
    service_categories: [],
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    business_address: '',
    city: '',
    state: '',
    zip_code: '',
    service_radius: 10,
    mobile_service: false,
    services: [],
    years_in_business: 0,
    license_number: '',
    insurance_verified: false,
    operating_hours: {
      monday: defaultDayHours,
      tuesday: defaultDayHours,
      wednesday: defaultDayHours,
      thursday: defaultDayHours,
      friday: defaultDayHours,
      saturday: { ...defaultDayHours, start_time: '10:00', end_time: '16:00' },
      sunday: { open: false, start_time: '09:00', end_time: '17:00', breaks: [] }
    },
    advance_booking_days: 30,
    marketing_consent: false,
    referral_source: ''
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  // const [businessImages, setBusinessImages] = useState<File[]>([]);

  const totalSteps = 6;

  // Validation schemas for each step
  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};

    switch (step) {
      case 1: // Business Information
        if (!formData.business_name.trim()) newErrors.business_name = 'Business name is required';
        if (!formData.business_description.trim()) newErrors.business_description = 'Business description is required';
        if (!formData.business_type) newErrors.business_type = 'Business type is required';
        if (formData.service_categories.length === 0) newErrors.service_categories = 'Select at least one service category';
        break;

      case 2: // Contact Information
        if (!formData.contact_name.trim()) newErrors.contact_name = 'Contact name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        break;

      case 3: // Location & Service Area
        if (!formData.business_address.trim()) newErrors.business_address = 'Business address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state.trim()) newErrors.state = 'State is required';
        if (!formData.zip_code.trim()) newErrors.zip_code = 'ZIP code is required';
        break;

      case 4: // Services & Pricing
        if (formData.services.length === 0) newErrors.services = 'Add at least one service';
        formData.services.forEach((service, index) => {
          if (!service.name.trim()) newErrors[`service_${index}_name`] = 'Service name is required';
          if (service.price_cents <= 0) newErrors[`service_${index}_price`] = 'Service price must be greater than $0';
          if (service.duration_minutes <= 0) newErrors[`service_${index}_duration`] = 'Service duration is required';
        });
        break;

      case 5: // Business Details
        if (formData.years_in_business < 0) newErrors.years_in_business = 'Years in business cannot be negative';
        break;

      case 6: // Availability & Final
        // No required validation for this step, but check operating hours
        const hasOpenDays = Object.values(formData.operating_hours).some(day => day.open);
        if (!hasOpenDays) newErrors.operating_hours = 'You must be open at least one day per week';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleInputChange = (field: keyof VendorFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addService = () => {
    const newService: ServiceOffering = {
      id: `service_${Date.now()}`,
      name: '',
      description: '',
      category: formData.service_categories[0] || '',
      duration_minutes: 60,
      price_cents: 5000,
      deposit_required: false,
      deposit_percentage: 20,
    };
    setFormData(prev => ({
      ...prev,
      services: [...prev.services, newService],
    }));
  };

  const updateService = (serviceId: string, updates: Partial<ServiceOffering>) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.map(service =>
        service.id === serviceId ? { ...service, ...updates } : service
      ),
    }));
  };

  const removeService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter(service => service.id !== serviceId),
    }));
  };


  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Create FormData for file uploads
      const submitData = new FormData();
      
      // Add form data
      Object.entries(formData).forEach(([key, value]) => {
        if (typeof value === 'object') {
          submitData.append(key, JSON.stringify(value));
        } else {
          submitData.append(key, String(value));
        }
      });

      // Add images
      // businessImages.forEach((image, index) => {
      //   submitData.append(`business_image_${index}`, image);
      // });

      const response = await fetch('/api/vendor/register', {
        method: 'POST',
        body: submitData
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.href = '/vendor/dashboard';
          }
        }, 3000);
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitStatus('error');
      setErrors({ submit: error instanceof Error ? error.message : 'Registration failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success/Error screens
  if (submitStatus === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4"
      >
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Registration Successful!</h1>
          <p className="text-gray-600 mb-6">
            Welcome to Bookiji! Your vendor account has been created and is pending verification. 
            You&apos;ll receive an email with next steps within 24 hours.
          </p>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              Redirecting to your dashboard
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (submitStatus === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4"
      >
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Registration Failed</h1>
          <p className="text-gray-600 mb-6">
            {errors.submit || 'There was an error processing your registration. Please try again.'}
          </p>
          <button
            onClick={() => setSubmitStatus('idle')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Vendor Registration</h1>
            <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <motion.div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {/* Step Labels */}
          <div className="grid grid-cols-6 gap-2">
            {[
              'Business Info',
              'Contact',
              'Location',
              'Services',
              'Details',
              'Availability'
            ].map((label, index) => (
              <div
                key={label}
                className={`text-center text-xs ${
                  index + 1 <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 1: Business Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900">Tell us about your business</h2>
                    <p className="text-gray-600">Help customers understand what you offer</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name *
                      </label>
                      <input
                        type="text"
                        value={formData.business_name}
                        onChange={(e) => handleInputChange('business_name', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.business_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Your Business Name"
                      />
                      {errors.business_name && (
                        <p className="text-red-600 text-sm mt-1">{errors.business_name}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Description *
                      </label>
                      <textarea
                        value={formData.business_description}
                        onChange={(e) => handleInputChange('business_description', e.target.value)}
                        rows={4}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.business_description ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Describe your business, services, and what makes you unique."
                      />
                      {errors.business_description && (
                        <p className="text-red-600 text-sm mt-1">{errors.business_description}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Type *
                      </label>
                      <select
                        value={formData.business_type}
                        onChange={(e) => handleInputChange('business_type', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.business_type ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select business type</option>
                        <option value="sole_proprietorship">Sole Proprietorship</option>
                        <option value="llc">LLC</option>
                        <option value="corporation">Corporation</option>
                        <option value="partnership">Partnership</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.business_type && (
                        <p className="text-red-600 text-sm mt-1">{errors.business_type}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Years in Business
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.years_in_business}
                        onChange={(e) => handleInputChange('years_in_business', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Service Categories * (Select all that apply)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {serviceCategories.map((category) => (
                          <label key={category} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.service_categories.includes(category)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleInputChange('service_categories', [...formData.service_categories, category]);
                                } else {
                                  handleInputChange('service_categories', formData.service_categories.filter(c => c !== category));
                                }
                              }}
                              className="mr-2 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{category}</span>
                          </label>
                        ))}
                      </div>
                      {errors.service_categories && (
                        <p className="text-red-600 text-sm mt-1">{errors.service_categories}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Contact Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <User className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
                    <p className="text-gray-600">How can customers reach you?</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        value={formData.contact_name}
                        onChange={(e) => handleInputChange('contact_name', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.contact_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Your full name"
                      />
                      {errors.contact_name && (
                        <p className="text-red-600 text-sm mt-1">{errors.contact_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.email ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="your@email.com"
                      />
                      {errors.email && (
                        <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.phone ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="+1 (555) 123-4567"
                      />
                      {errors.phone && (
                        <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website (Optional)
                      </label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://yourbusiness.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900">Location & Service Area</h2>
                    <p className="text-gray-600">Where is your business located?</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                      <input
                        type="text"
                        value={formData.business_address}
                        onChange={e => handleInputChange('business_address', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.business_address ? 'border-red-300' : 'border-gray-300'}`}
                        placeholder="123 Main St"
                      />
                      {errors.business_address && <p className="text-red-600 text-sm mt-1">{errors.business_address}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={e => handleInputChange('city', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.city ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {errors.city && <p className="text-red-600 text-sm mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={e => handleInputChange('state', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.state ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {errors.state && <p className="text-red-600 text-sm mt-1">{errors.state}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
                      <input
                        type="text"
                        value={formData.zip_code}
                        onChange={e => handleInputChange('zip_code', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.zip_code ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {errors.zip_code && <p className="text-red-600 text-sm mt-1">{errors.zip_code}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Service Radius (km)</label>
                      <input
                        type="number"
                        value={formData.service_radius}
                        onChange={e => handleInputChange('service_radius', Number(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-center mt-6">
                      <input
                        type="checkbox"
                        checked={formData.mobile_service}
                        onChange={e => handleInputChange('mobile_service', e.target.checked)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">I offer mobile services</span>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900">Services & Pricing</h2>
                    <p className="text-gray-600">List the services you provide</p>
                  </div>
                  {formData.services.map(service => (
                    <div key={service.id} className="border p-4 rounded-lg space-y-2">
                      <input
                        type="text"
                        value={service.name}
                        onChange={e => updateService(service.id, { name: e.target.value })}
                        placeholder="Service name"
                        className="w-full border px-2 py-1 rounded"
                      />
                      <input
                        type="number"
                        value={service.duration_minutes}
                        onChange={e => updateService(service.id, { duration_minutes: Number(e.target.value) })}
                        placeholder="Duration (min)"
                        className="w-full border px-2 py-1 rounded"
                      />
                      <input
                        type="number"
                        value={service.price_cents / 100}
                        onChange={e => updateService(service.id, { price_cents: Number(e.target.value) * 100 })}
                        placeholder="Price ($)"
                        className="w-full border px-2 py-1 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeService(service.id)}
                        className="text-sm text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addService}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Add Service
                  </button>
                  {errors.services && <p className="text-red-600 text-sm">{errors.services}</p>}
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900">Business Details</h2>
                    <p className="text-gray-600">A few more details</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                      <input
                        type="text"
                        value={formData.license_number}
                        onChange={e => handleInputChange('license_number', e.target.value)}
                        className="w-full border px-4 py-2 rounded"
                      />
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.insurance_verified}
                        onChange={e => handleInputChange('insurance_verified', e.target.checked)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      Insurance verified
                    </label>
                  </div>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900">Final Details</h2>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.marketing_consent}
                      onChange={e => handleInputChange('marketing_consent', e.target.checked)}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    I agree to receive marketing emails
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Referral Source</label>
                    <input
                      type="text"
                      value={formData.referral_source}
                      onChange={e => handleInputChange('referral_source', e.target.value)}
                      className="w-full border px-4 py-2 rounded"
                    />
                  </div>
                </div>
              )}

              
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-shadow flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Submitting
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Registration
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { theme, combineClasses } from '@/config/theme';
import type { ServiceTypeProposal } from '@/types/serviceTypes';

export default function VendorOnboardingPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    serviceType: '',
    customServiceType: '',
    location: '',
    email: '',
    phone: '',
    description: '',
    agreeToTerms: false
  });

  const [showCustomServiceInput, setShowCustomServiceInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serviceTypes = [
    'Hair & Beauty',
    'Wellness & Spa', 
    'Fitness & Sports',
    'Home Services',
    'Professional Services',
    'Entertainment',
    'Education & Tutoring',
    'Other'
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Show custom service input when "Other" is selected
    if (field === 'serviceType') {
      setShowCustomServiceInput(value === 'Other');
    }
  };

  const createServiceTypeProposal = (): ServiceTypeProposal => {
    return {
      id: `proposal_${Date.now()}`,
      proposedServiceType: formData.customServiceType,
      submittedBy: {
        businessName: formData.businessName,
        email: formData.email,
        phone: formData.phone
      },
      submittedAt: new Date(),
      status: 'pending'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Prepare submission data
      const submissionData = {
        ...formData,
        serviceType: formData.serviceType === 'Other' ? formData.customServiceType : formData.serviceType,
        isCustomServiceType: formData.serviceType === 'Other',
        password: 'temp_password_123' // TODO: Add proper password field
      };

      // Call vendor registration API
      const response = await fetch('/api/vendor/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Vendor registered successfully:', data.vendor);
        
        // Show success message based on registration type
        if (data.vendor.status === 'pending_approval') {
          alert('Registration submitted! Your custom service type will be reviewed by our team. You\'ll receive an email within 24-48 hours.');
        } else {
          alert('Registration successful! Please check your email to verify your account before you can start accepting bookings.');
        }

        // TODO: Redirect to success page or dashboard
        // router.push('/vendor/dashboard');
        
      } else {
        throw new Error(data.error || 'Registration failed');
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={combineClasses(
      'min-h-screen',
      theme.colors.background.gradient,
      'py-12 px-4 sm:px-6 lg:px-8'
    )}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={combineClasses(
            'text-4xl font-extrabold mb-4',
            theme.typography.heading.gradient
          )}>
            Become a Bookiji Provider
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join our network of trusted service providers and start earning with reliable customers who are committed to showing up.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Benefits Section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Providers Choose Bookiji</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl">💰</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Reduce No-Shows</h3>
                    <p className="text-gray-600">$1 commitment fee ensures customers are serious about their bookings</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl">🛡️</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Privacy Protection</h3>
                    <p className="text-gray-600">Your location stays private until booking is confirmed</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl">📱</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Easy Management</h3>
                    <p className="text-gray-600">Simple dashboard to manage bookings and customer communication</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl">🎯</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Quality Customers</h3>
                    <p className="text-gray-600">AI-powered matching connects you with the right customers</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={combineClasses(
              theme.components.card.background,
              theme.components.card.border,
              theme.components.card.shadow,
              theme.components.card.rounded,
              'p-6'
            )}>
              <h3 className="font-semibold text-gray-900 mb-4">How It Works</h3>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">1</span>
                  <span>Complete your provider profile and service details</span>
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">2</span>
                  <span>Customers find you through our AI-powered search</span>
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">3</span>
                  <span>Receive booking requests and confirm availability</span>
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">4</span>
                  <span>Customer pays $1 commitment fee to guarantee their spot</span>
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">5</span>
                  <span>Exchange contact details and arrange the service</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Registration Form */}
          <div>
            <div className={combineClasses(
              theme.components.card.background,
              theme.components.card.border,
              theme.components.card.shadow,
              theme.components.card.rounded,
              'p-8'
            )}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Provider Registration</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    className={combineClasses(
                      theme.components.input.base,
                      theme.components.input.focus,
                      theme.components.input.rounded,
                      theme.components.input.placeholder
                    )}
                    placeholder="Enter your business name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type *
                  </label>
                  <select
                    id="serviceType"
                    value={formData.serviceType}
                    onChange={(e) => handleInputChange('serviceType', e.target.value)}
                    className={combineClasses(
                      theme.components.input.base,
                      theme.components.input.focus,
                      theme.components.input.rounded
                    )}
                    required
                  >
                    <option value="">Select a service type</option>
                    {serviceTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {showCustomServiceInput && (
                  <div>
                    <label htmlFor="customServiceType" className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Service Type *
                    </label>
                    <input
                      type="text"
                      id="customServiceType"
                      value={formData.customServiceType}
                      onChange={(e) => handleInputChange('customServiceType', e.target.value)}
                      className={combineClasses(
                        theme.components.input.base,
                        theme.components.input.focus,
                        theme.components.input.rounded,
                        theme.components.input.placeholder
                      )}
                      placeholder="Describe your service type (e.g., Pet Grooming, Car Detailing)"
                      required
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      We'll review your service type and may add it to our standard categories for future providers.
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Service Location *
                  </label>
                  <input
                    type="text"
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className={combineClasses(
                      theme.components.input.base,
                      theme.components.input.focus,
                      theme.components.input.rounded,
                      theme.components.input.placeholder
                    )}
                    placeholder="City, State or Service Area"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={combineClasses(
                      theme.components.input.base,
                      theme.components.input.focus,
                      theme.components.input.rounded,
                      theme.components.input.placeholder
                    )}
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={combineClasses(
                      theme.components.input.base,
                      theme.components.input.focus,
                      theme.components.input.rounded,
                      theme.components.input.placeholder
                    )}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Service Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className={combineClasses(
                      theme.components.input.base,
                      theme.components.input.focus,
                      theme.components.input.rounded,
                      theme.components.input.placeholder
                    )}
                    placeholder="Briefly describe your services and what makes you unique"
                  />
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    required
                  />
                  <label htmlFor="agreeToTerms" className="ml-3 block text-sm text-gray-600">
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={combineClasses(
                    'w-full py-4 font-semibold rounded-xl',
                    theme.components.button.primary.base,
                    theme.components.button.primary.hover,
                    theme.components.button.primary.shadow,
                    theme.components.button.primary.rounded,
                    isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                  )}
                >
                  {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                </button>
              </form>

              <p className="mt-4 text-sm text-gray-500 text-center">
                We'll review your application and get back to you within 24 hours
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
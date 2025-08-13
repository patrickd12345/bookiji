'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useUIStore } from '@/stores/uiStore';
import { theme, combineClasses } from '@/config/theme';
import type { RegistrationForm } from '@/types/global.d';
import { supabase } from '@/lib/supabaseClient';

export default function CustomerRegistration() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RegistrationForm>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    role: 'customer',
    agreeToTerms: false,
    marketingConsent: false,
    preferences: {}
  });

  const { showRegistration } = useUIStore();

  if (!showRegistration) return null;

  const handleChange = (field: keyof RegistrationForm, value: string | boolean) => {
    setForm((prev: RegistrationForm) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate passwords match
      if (form.password !== form.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Register with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            role: 'customer'
          }
        }
      });

      if (signUpError) throw signUpError;

      // Create profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user?.id,
          full_name: form.name,
          email: form.email,
          phone: form.phone,
          role: 'customer',
          marketing_consent: form.marketingConsent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Redirect to dashboard
      window.location.href = '/customer/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = combineClasses(
    theme.components.input.base,
    theme.components.input.focus,
    theme.components.input.rounded,
    theme.components.input.placeholder
  );

  const buttonClasses = combineClasses(
    'w-full px-6 py-4 text-lg font-medium',
    theme.components.button.primary.base,
    theme.components.button.primary.hover,
    theme.components.button.primary.shadow,
    theme.components.button.primary.rounded,
    isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
  );

  const cardClasses = combineClasses(
    theme.components.card.background,
    theme.components.card.border,
    theme.components.card.shadow,
    theme.components.card.rounded,
    'p-8'
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={cardClasses}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={inputClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={inputClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className={inputClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className={inputClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="agreeToTerms"
                name="agreeToTerms"
                checked={form.agreeToTerms}
                onChange={(e) => handleChange('agreeToTerms', e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                required
              />
              <label htmlFor="agreeToTerms" className="ml-3 block text-sm text-gray-600">
                I agree to the <Link href="/terms" className="text-blue-600 hover:underline">terms and conditions</Link>
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="marketingConsent"
                name="marketingConsent"
                checked={form.marketingConsent}
                onChange={(e) => handleChange('marketingConsent', e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="marketingConsent" className="ml-3 block text-sm text-gray-600">
                Keep me updated about new features and announcements
              </label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={buttonClasses}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="loading-dots flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
} 
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowserClient } from '@/lib/supabaseClient';
import Link from 'next/link';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleType, setRoleType] = useState<'customer' | 'provider' | null>(
    searchParams?.get('role') === 'provider' ? 'provider' : 
    searchParams?.get('role') === 'customer' ? 'customer' : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const supabase = supabaseBrowserClient()
    if (!supabase) {
      setError('Unable to connect to authentication service. Please try again.');
      setIsSubmitting(false);
      return;
    }
    
    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsSubmitting(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }
    
    try {
      const redirectPath = roleType === 'provider' ? '/vendor/dashboard' : '/customer/dashboard';
      // Use API endpoint for registration to bypass email sending timeout
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role: roleType || 'customer',
          full_name: '',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/beta/signup');
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Provide more helpful error messages
        if (error.message.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.');
        } else if (error.message.includes('invalid')) {
          setError('Please check your email and password format.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(error.message || 'An error occurred during registration. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign up to book services or offer your services
          </p>
          
          {/* Role Selection */}
          <div className="mt-6 flex gap-4 justify-center">
            <button
              type="button"
              onClick={() => setRoleType('customer')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                roleType === 'customer'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500'
              }`}
            >
              <span className="block text-sm font-semibold">Book Services</span>
              <span className="block text-xs mt-1 opacity-90">(Customer)</span>
            </button>
            <button
              type="button"
              onClick={() => setRoleType('provider')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                roleType === 'provider'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-purple-500'
              }`}
            >
              <span className="block text-sm font-semibold">Offer Services</span>
              <span className="block text-xs mt-1 opacity-90">(Provider)</span>
            </button>
          </div>
          
          {roleType && (
            <p className="mt-4 text-center text-xs text-gray-500">
              {roleType === 'customer' 
                ? 'You\'ll be able to book appointments with service providers'
                : 'You\'ll be able to offer your services and manage bookings'}
            </p>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} suppressHydrationWarning>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                aria-required="true"
                minLength={8}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3" role="alert">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting || !roleType}
              className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
} 
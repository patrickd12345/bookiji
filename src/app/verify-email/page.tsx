'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    
    // If there's a token, verify it
    if (token) {
      verifyEmail(token);
    }
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) throw error;

      // Redirect to dashboard on success
      router.push('/dashboard');
    } catch (err) {
      console.error('Verification error:', err);
      // Handle error (you might want to show an error message)
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Check your email
            </h2>
            <p className="text-gray-600 mb-6">
              We sent you a verification link. Please check your email and click the link to verify your account.
            </p>
            <div className="animate-bounce text-4xl mb-6">
              ✉️
            </div>
            <p className="text-sm text-gray-500">
              Didn't receive an email? Check your spam folder or{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-blue-600 hover:text-blue-500"
              >
                try registering again
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
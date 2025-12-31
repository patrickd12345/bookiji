'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowserClient } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = supabaseBrowserClient()
      if (!supabase) {
        router.push('/login?error=auth');
        return;
      }
      
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error during auth callback:', error.message);
        router.push('/login?error=auth');
        return;
      }

      if (session) {
        const redirectParam = new URLSearchParams(window.location.search).get('redirect')
        const redirectTo = redirectParam && redirectParam.startsWith('/') ? redirectParam : null

        // Check if user is admin and redirect accordingly
        try {
          const adminCheck = await fetch('/api/auth/check-admin', {
            method: 'GET',
            credentials: 'include'
          })
          
          if (adminCheck.ok) {
            const { isAdmin } = await adminCheck.json()
            if (isAdmin) {
              // Always redirect admins to admin cockpit
              router.push('/admin')
              return
            }
          }
        } catch (adminError) {
          console.warn('Failed to check admin status:', adminError)
          // Continue with normal redirect
        }
        
        // Successful login - honor redirect parameter when present
        router.push(redirectTo || '/customer/dashboard');
      } else {
        // No session found
        router.push('/login');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-xl font-semibold text-gray-900">
              Completing sign in...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we verify your credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
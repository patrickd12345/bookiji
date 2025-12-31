'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthEntry from '@/components/AuthEntry';
import { theme, combineClasses } from '@/config/theme';
import { useAuthReady } from '@/hooks/useAuthReady';
import { supabaseBrowserClient } from '@/lib/supabaseClient';

export default function GetStartedPage() {
  const router = useRouter();
  const { ready, session } = useAuthReady();
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  useEffect(() => {
    if (!ready || !session) return;
    
    const checkOnboardingStatus = async () => {
      setCheckingOnboarding(true);
      try {
        const supabase = supabaseBrowserClient();
        if (!supabase) {
          router.replace('/choose-role');
          return;
        }

        // Check if user has a profile with a role (onboarding completed)
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('auth_user_id', session.user.id)
          .limit(1);

        if (error) {
          console.error('Error checking profile:', error);
          // On error, redirect to choose-role to be safe
          router.replace('/choose-role');
          return;
        }

        const profile = Array.isArray(profiles) ? profiles[0] : null;
        
        // If user has no profile or no role, they need to complete onboarding
        if (!profile || !profile.role) {
          router.replace('/choose-role');
          return;
        }
        
        // User has completed onboarding, redirect to dashboard
        router.replace('/customer/dashboard');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // On error, redirect to choose-role to be safe
        router.replace('/choose-role');
      } finally {
        setCheckingOnboarding(false);
      }
    };
    
    checkOnboardingStatus();
  }, [ready, session, router]);

  if (ready && session && !checkingOnboarding) {
    return null; // Don't render anything while redirecting
  }
  
  if (checkingOnboarding) {
    return null; // Don't render anything while checking
  }

  return (
    <div className={combineClasses(
      'min-h-screen',
      theme.colors.background.gradient,
      'py-12 px-4 sm:px-6 lg:px-8'
    )}>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className={combineClasses(
            'text-4xl font-extrabold',
            theme.typography.heading.gradient
          )}>
            Get Started with Bookiji
          </h1>
          <p className={combineClasses(
            'mt-3 text-xl',
            theme.typography.body.color
          )}>
            Join the world&apos;s first AI-powered booking platform
          </p>
        </div>
        <AuthEntry mode="signup" />
      </div>
    </div>
  );
} 
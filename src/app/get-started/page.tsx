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
  const [checkingRoles, setCheckingRoles] = useState(false);

  useEffect(() => {
    if (!ready || !session) return;

    const checkUserRoles = async () => {
      setCheckingRoles(true);
      try {
        const supabase = supabaseBrowserClient();
        if (!supabase) {
          router.replace('/choose-role');
          return;
        }

        // Check if user has completed onboarding by checking for roles
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/choose-role');
          return;
        }

        // Check user_role_summary to see if user has any roles
        const { data: roleSummary } = await supabase
          .from('user_role_summary')
          .select('roles')
          .eq('user_id', user.id)
          .maybeSingle();

        // If no roles found, redirect to choose-role
        if (!roleSummary || !roleSummary.roles || roleSummary.roles.length === 0) {
          router.replace('/choose-role');
          return;
        }

        // User has roles, redirect to dashboard
        router.replace('/customer/dashboard');
      } catch (error) {
        console.error('Error checking user roles:', error);
        // On error, redirect to choose-role to be safe
        router.replace('/choose-role');
      } finally {
        setCheckingRoles(false);
      }
    };

    checkUserRoles();
  }, [ready, session, router]);

  if (ready && session) {
    if (checkingRoles) {
      return null; // Don't render anything while checking
    }
    return null; // Don't render anything while redirecting
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
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n/useI18n';
import NotificationBell from '@/components/NotificationBell';

// Toggle full navigation with NEXT_PUBLIC_ENABLE_NAV (defaults to false)
const SHOW_NAV_ITEMS = process.env.NEXT_PUBLIC_ENABLE_NAV === 'true';

export default function MainNavigation() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isBetaUser, setIsBetaUser] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);

    if (session) {
      // Check user role
      const { data: profile } = await supabase
        .from('user_role_summary')
        .select('roles, beta_status')
        .eq('user_id', session.user.id)
        .single();

      if (profile) {
        setUserRole(profile.roles[0]);
        setIsBetaUser(!!profile.beta_status);
      }
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-blue-600">Bookiji</span>
            </Link>
          </div>

          {SHOW_NAV_ITEMS && (
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === '/dashboard'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('nav.dashboard')}
                  </Link>

                  {userRole === 'vendor' && (
                    <Link
                      href="/vendor/calendar"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        pathname.startsWith('/vendor')
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t('nav.vendor_portal')}
                    </Link>
                  )}

                  <NotificationBell />

                  <Link 
                    href="/settings"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname.startsWith('/settings')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('nav.settings')} {isBetaUser && <span className="ml-1">⚡</span>}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/get-started"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('nav.start_booking')}
                  </Link>
                  <Link
                    href="/vendor/onboarding"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('nav.list_business')}
                  </Link>
                  <Link
                    href="/login"
                    className="px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    {t('nav.log_in')}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 
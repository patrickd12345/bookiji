'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n/useI18n';
import NotificationBell from '@/components/NotificationBell';
import { useRouter } from 'next/navigation';

// Toggle full navigation with NEXT_PUBLIC_ENABLE_NAV (defaults to false)
const SHOW_NAV_ITEMS = process.env.NEXT_PUBLIC_ENABLE_NAV === 'true';

export default function MainNavigation() {
  const pathname = usePathname() ?? '';
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isBetaUser, setIsBetaUser] = useState(false);
  const { t } = useI18n();
  const router = useRouter();

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
    <nav className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-primary">Bookiji</span>
            </Link>
          </div>

          {SHOW_NAV_ITEMS && (
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/customer/dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === '/customer/dashboard'
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {t('nav.dashboard')}
                  </Link>

                  {userRole === 'vendor' && (
                    <Link
                      href="/vendor/calendar"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        pathname.startsWith('/vendor')
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {t('nav.vendor_portal')}
                    </Link>
                  )}

                  <NotificationBell />

                  <Link
                    href="/help"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname.startsWith('/help')
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    Help
                  </Link>

                  <Link
                    href="/settings"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname.startsWith('/settings')
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {t('nav.settings')} {isBetaUser && <span className="ml-1">⚡</span>}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/get-started"
                    className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {t('nav.start_booking')}
                  </Link>
                  <button
                    onClick={() => {
                      if (isLoggedIn && userRole !== 'vendor') {
                        router.push('/customer/dashboard');
                      } else {
                        router.push('/register?redirect=/customer/dashboard');
                      }
                    }}
                    className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted flex flex-col items-start"
                    aria-label="Book an appointment as a customer"
                  >
                    <span>Book an Appointment</span>
                    <span className="text-xs text-gray-500">(Customer)</span>
                  </button>
                  <button
                    onClick={() => {
                      if (isLoggedIn && userRole === 'vendor') {
                        router.push('/vendor/dashboard');
                      } else {
                        router.push('/register?redirect=/vendor/dashboard');
                      }
                    }}
                    className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted flex flex-col items-start"
                    aria-label="Offer your services as a provider"
                  >
                    <span>Offer Your Services</span>
                    <span className="text-xs text-gray-500">(Provider)</span>
                  </button>
                  <Link
                    href="/help"
                    className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted"
                  >
                    Help
                  </Link>
                  <Link
                    href="/login"
                    className="px-3 py-2 rounded-md text-sm font-medium text-primary hover:opacity-80"
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
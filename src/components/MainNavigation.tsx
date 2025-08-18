'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n/useI18n';
import NotificationBell from '@/components/NotificationBell';
import { useRouter } from 'next/navigation';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

// Toggle full navigation with NEXT_PUBLIC_ENABLE_NAV (defaults to false)
const SHOW_NAV_ITEMS = process.env.NEXT_PUBLIC_ENABLE_NAV === 'true';

export default function MainNavigation() {
  const pathname = usePathname() ?? '';
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
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
      try {
        // Try to get profile with roles and beta_status, fallback to basic profile if needed
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, beta_status')
          .eq('id', session.user.id)
          .single();

        if (error) {
          if (error.code === '500' || error.message.includes('500')) {
            console.warn('⚠️ Server error (500) accessing profiles table - table may be corrupted')
            // Set default values to prevent UI crashes
            setRoles(['customer']);
            setUserRole('customer');
            setIsBetaUser(false);
            return;
          }
          console.warn('Error fetching profile:', error.message);
          // Set default values
          setRoles(['customer']);
          setUserRole('customer');
          setIsBetaUser(false);
          return;
        }

        if (profile) {
          // Handle both old 'roles' array and new 'role' string format
          let rolesArray: string[] = [];
          if (profile.role) {
            // Single role from profiles table
            rolesArray = [profile.role];
          } else if ((profile as { roles?: string[] }).roles) {
            // Legacy roles array format
            rolesArray = (profile as { roles?: string[] }).roles || [];
          } else {
            // Default to customer if no role specified
            rolesArray = ['customer'];
          }

          const r = rolesArray.map((role: string) =>
            role === 'provider' ? 'vendor' : role
          );
          setRoles(r);
          const defaultRole = r.includes('customer') ? 'customer' : r[0] || null;
          setUserRole(defaultRole);
          setIsBetaUser(!!profile.beta_status);
        } else {
          // No profile found, set defaults
          setRoles(['customer']);
          setUserRole('customer');
          setIsBetaUser(false);
        }
      } catch (error) {
        console.error('Exception in checkAuth:', error);
        // Set default values to prevent UI crashes
        setRoles(['customer']);
        setUserRole('customer');
        setIsBetaUser(false);
      }
    }
  };

  return (
    <nav className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center" aria-current={pathname === '/' ? 'page' : undefined}>
              <span className="text-xl font-bold text-primary">Bookiji</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {SHOW_NAV_ITEMS && (
              <>
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/customer/dashboard"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        pathname === '/customer/dashboard'
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                      aria-current={pathname === '/customer/dashboard' ? 'page' : undefined}
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
                        aria-current={pathname.startsWith('/vendor') ? 'page' : undefined}
                      >
                        {t('nav.vendor_portal')}
                      </Link>
                    )}

                    {roles.length > 1 && (
                      <select
                        data-testid="role-switcher"
                        value={userRole ?? ''}
                        onChange={(e) => {
                          const role = e.target.value;
                          setUserRole(role);
                          router.push(role === 'vendor' ? '/vendor/dashboard' : '/customer/dashboard');
                        }}
                        className="px-2 py-1 border rounded"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    )}

                    <NotificationBell />

                    <Link
                      href="/help"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        pathname.startsWith('/help')
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                      aria-current={pathname.startsWith('/help') ? 'page' : undefined}
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
                      aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
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
              </>
            )}

            {/* Always show theme switcher at top-right */}
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
} 
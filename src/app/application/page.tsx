"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { theme, combineClasses } from '@/config/theme';
import MapAbstraction from '@/components/MapAbstraction';
import { supabase } from '@/lib/supabaseClient';


export default function ApplicationPage() {
  const [query, setQuery] = useState('');
  const [showAvailableNow, setShowAvailableNow] = useState(true);
  const [markers, setMarkers] = useState<Array<{ id: string; lat: number; lng: number; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  // Remove unused applications and setApplications
  // const [applications, setApplications] = useState<ApplicationData[]>([]);

  useEffect(() => {
    async function fetchLocations() {
      setLoading(true);
      // Fetch provider locations and join with users for business name
      const { data, error } = await supabase
        .from('provider_locations')
        .select('id, latitude, longitude, vendor_id, is_active, users:vendor_id (full_name)')
        .eq('is_active', true);
      if (error) {
        setMarkers([]);
        setLoading(false);
        return;
      }
      // Map to marker format for MapAbstraction
      const mapped = (data || []).map((loc: unknown) => {
        const location = loc as { id: string; latitude: string; longitude: string; vendor_id: string; users: { full_name: string } | null };
        return {
          id: location.id,
          lat: parseFloat(location.latitude),
          lng: parseFloat(location.longitude),
          label: location.users?.full_name || 'Provider',
        };
      });
      setMarkers(mapped);
      setLoading(false);
    }
    fetchLocations();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-6 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="Bookiji Logo" width={32} height={32} />
          <span className={combineClasses(
            'font-bold text-2xl tracking-tight',
            theme.typography.heading.gradient
          )}>
            Bookiji
          </span>
        </div>
      </header>

      {/* Hero Booking Section */}
      <main className="flex flex-col items-center flex-1 py-8">
        {/* Map with provider markers */}
        {loading ? (
          <div className="w-full h-[600px] flex items-center justify-center text-xl text-gray-500">Loading map...</div>
        ) : (
          <MapAbstraction markers={markers} />
        )}
        {/* Toggle for Available Now / All Bookings */}
        <div className="flex items-center gap-4 mt-8 mb-4">
          <span className={showAvailableNow ? 'font-semibold text-blue-600' : 'text-gray-500'}>Available Now</span>
          <button
            onClick={() => setShowAvailableNow((v) => !v)}
            className={combineClasses(
              'w-14 h-8 rounded-full flex items-center px-1 transition-colors duration-300',
              showAvailableNow ? 'bg-blue-600' : 'bg-gray-300'
            )}
            aria-label="Toggle available now filter"
          >
            <span
              className={combineClasses(
                'w-6 h-6 rounded-full bg-white shadow transform transition-transform',
                showAvailableNow ? 'translate-x-6' : 'translate-x-0'
              )}
            />
          </button>
          <span className={!showAvailableNow ? 'font-semibold text-blue-600' : 'text-gray-500'}>All Bookings</span>
        </div>
        {/* Conversational AI Input */}
        <div className="flex flex-col items-center w-full max-w-xl mb-6">
          <input
            type="text"
            className={combineClasses(
              'w-full px-6 py-4 rounded-full border-2 text-lg focus:outline-none focus:ring-2 bg-white shadow',
              'border-blue-600 focus:ring-blue-500',
              theme.components.input.placeholder
            )}
            placeholder="What do you want to book? (e.g. haircut, massage, tennis court)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        {/* Book Now Button with 5s glow animation */}
        <button
          className={combineClasses(
            'px-12 py-4 rounded-full text-white text-xl font-bold shadow-lg transition-all mb-8 animate-glow-5s',
            theme.components.button.primary.base,
            theme.components.button.primary.hover,
            theme.components.button.primary.shadow
          )}
        >
          Book Now
        </button>
      </main>

      {/* Collapsed Sections */}
      <section className="w-full max-w-2xl mx-auto flex flex-col gap-4 mb-8">
        <details className="bg-white rounded-xl shadow p-4">
          <summary className={combineClasses(
            'font-semibold cursor-pointer text-lg',
            theme.typography.heading.gradient
          )}>
            How it Works
          </summary>
          <ol className="list-decimal list-inside space-y-2 text-gray-800 mt-2">
            <li>Describe what you want to book (chat, voice, or search)</li>
            <li>See instant, privacy-protected options</li>
            <li>Book with $1, get instant confirmation</li>
            <li>Show up, earn rewards, build your reliability</li>
          </ol>
        </details>
        <details className="bg-white rounded-xl shadow p-4">
          <summary className={combineClasses(
            'font-semibold cursor-pointer text-lg',
            theme.typography.heading.gradient
          )}>
            Testimonials
          </summary>
          <p className="italic text-gray-600 mt-2">&quot;Bookiji made booking so easy and reliable!&quot;</p>
          <p className="italic text-gray-600">&quot;No more no-shows. I love the $1 guarantee.&quot;</p>
        </details>
        <details className="bg-white rounded-xl shadow p-4">
          <summary className={combineClasses(
            'font-semibold cursor-pointer text-lg',
            theme.typography.heading.gradient
          )}>
            FAQ
          </summary>
          <p className="mb-1 mt-2"><b>How does the $1 fee work?</b> It guarantees your spot and reduces no-shows.</p>
          <p className="mb-1"><b>What if my vendor cancels?</b> You&apos;ll get the provider&apos;s contact info after booking - arrange directly with them.</p>
          <p className="mb-1"><b>What about no-show penalties?</b> Vendors may indicate their own policies on their booking offers - check their terms.</p>
          <p className="mb-1"><b>How is my privacy protected?</b> Both parties contact details are abstracted until booking is confirmed.</p>
        </details>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-100 py-4 text-center text-gray-600 border-t">
        About | Contact | Provider Onboarding | Beta Feedback | Legal
      </footer>
    </div>
  );
} 
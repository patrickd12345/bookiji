'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { supabaseBrowserClient } from '@/lib/supabaseClient';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to notifications page as the default settings page
    router.replace('/settings/notifications');
  }, [router]);

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    </div>
  );
}










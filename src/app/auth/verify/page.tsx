'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function VerifyPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus('error');
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ token, type: 'signup', email: '' });
      setStatus(error ? 'error' : 'success');
    }
    verify();
  }, [token]);

  if (status === 'loading') return <p>Verifying...</p>;
  if (status === 'success') return <p>Verification successful. You may now log in.</p>;
  return <p>Verification failed.</p>;
}

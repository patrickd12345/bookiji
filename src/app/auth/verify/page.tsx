'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        setStatus(data.ok ? 'success' : 'error');
      } catch {
        setStatus('error');
      }
    }
    verify();
  }, [token]);

  if (status === 'loading') return <p>Verifying...</p>;
  if (status === 'success')
    return (
      <div>
        <p>Verification successful.</p>
        <a href="/login" className="text-blue-600 underline">Log in</a>
      </div>
    );
  return (
    <div>
      <p>Verification failed.</p>
      <a href="/login" className="text-blue-600 underline">Back to login</a>
    </div>
  );
}

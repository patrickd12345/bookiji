'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid token');
      return;
    }
    const { error: verifyError } = await supabase.auth.verifyOtp({ token, type: 'recovery', email: '' });
    if (verifyError) {
      setError('Verification failed');
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Update failed');
      return;
    }
    router.push('/login');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Reset Password</h1>
      {error && <p className="text-red-500">{error}</p>}
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="border p-2"
        placeholder="New password"
      />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
        Update Password
      </button>
    </form>
  );
}

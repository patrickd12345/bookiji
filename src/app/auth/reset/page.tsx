'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function ResetPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid token');
      return;
    }
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
      } else {
        setError(data.error || 'Reset failed');
      }
    } catch {
      setError('Reset failed');
    }
  };

  if (done)
    return (
      <div className="p-4 space-y-2">
        <p>Password updated.</p>
        <a href="/login" className="text-blue-600 underline">Log in</a>
      </div>
    );

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

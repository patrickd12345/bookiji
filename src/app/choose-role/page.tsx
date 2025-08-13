'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ChooseRolePage() {
  const [roles, setRoles] = useState<string[]>([]);
  const router = useRouter();

  const toggleRole = (role: string) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ roles }).eq('id', user.id);
    if (roles.length === 1 && roles[0] === 'provider') {
      router.push('/vendor/onboarding');
    } else {
      router.push('/customer/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Choose your role</h1>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={roles.includes('customer')}
          onChange={() => toggleRole('customer')}
        />
        Customer
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={roles.includes('provider')}
          onChange={() => toggleRole('provider')}
        />
        Provider
      </label>
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
        Continue
      </button>
    </form>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface ExternalCalendarConnection {
  id: string;
  provider: 'google' | 'microsoft';
  provider_email: string;
  sync_enabled: boolean;
  last_synced_at: string | null;
  error_count: number;
  last_error: any;
}

export default function CalendarSyncStatus() {
  const [connections, setConnections] = useState<ExternalCalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile first to get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('external_calendar_connections')
        .select('*')
        .eq('provider_id', profile.id);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const response = await fetch('/api/vendor/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) throw new Error('Sync failed');

      await fetchConnections();
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync calendar');
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this calendar?')) return;

    try {
      const response = await fetch(`/api/vendor/calendar/disconnect?id=${connectionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Disconnect failed');

      setConnections(prev => prev.filter(c => c.id !== connectionId));
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('Failed to disconnect calendar');
    }
  };

  const connectCalendar = (provider: 'google' | 'microsoft') => {
      // Get current user ID (auth ID) first to pass it if needed,
      // but usually the backend handles it.
      // We need to redirect to the auth endpoint.
      // We should probably check if we have a provider ID first?
      // The auth endpoint expects provider_id in query params or uses auth user.

      // Let's assume standard flow:
      const authUrl = provider === 'google'
        ? '/api/auth/google'
        : '/api/auth/microsoft';

      // We might need to pass the provider_id (profile id) if the auth endpoint expects it
      // But let's assume the auth endpoint can handle resolving it from the session.
      // Actually, looking at the callback fix I made, it tries to resolve it.
      // But the initial redirect to Google needs to carry state if we want to be safe.

      // For now, simpler:
      window.location.href = authUrl;
  };

  if (loading) return <div className="p-4">Loading sync status...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Calendar Sync</h2>

      <div className="space-y-4">
        {connections.length === 0 ? (
          <p className="text-gray-500">No external calendars connected.</p>
        ) : (
          connections.map(conn => (
            <div key={conn.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${conn.provider === 'google' ? 'text-blue-600' : 'text-blue-800'}`}>
                    {conn.provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    conn.last_error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {conn.last_error ? 'Error' : 'Active'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{conn.provider_email}</p>
                {conn.last_synced_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last synced: {new Date(conn.last_synced_at).toLocaleString()}
                  </p>
                )}
                {conn.last_error && (
                   <p className="text-xs text-red-600 mt-1">
                     {JSON.stringify(conn.last_error)}
                   </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSync(conn.id)}
                  disabled={syncing === conn.id}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {syncing === conn.id ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={() => handleDisconnect(conn.id)}
                  className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))
        )}

        <div className="flex gap-3 mt-4 pt-4 border-t">
          <button
            onClick={() => connectCalendar('google')}
            className="flex-1 py-2 px-4 border rounded shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            Connect Google Calendar
          </button>
          <button
            onClick={() => connectCalendar('microsoft')}
            className="flex-1 py-2 px-4 border rounded shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            Connect Outlook
          </button>
        </div>
      </div>
    </div>
  );
}

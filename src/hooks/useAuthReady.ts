import { useEffect, useState, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

/**
 * Hook to safely check if auth is ready and session is available.
 * Prevents race conditions between initial session fetch and auth state changes.
 * 
 * @returns { ready: boolean, session: Session | null }
 * - ready: true when auth state has been determined (even if no session exists)
 * - session: current session or null if not authenticated
 */
export function useAuthReady() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const initialFetchDone = useRef(false);

  useEffect(() => {
    const supabase = supabaseBrowserClient()
    if (!supabase) {
      // If supabase client is not available, mark as ready with no session
      setReady(true);
      setSession(null);
      return;
    }

    let mounted = true;

    // Initial session fetch
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (error) {
          console.warn('Error fetching initial session:', error);
          // Still mark as ready even on error - user is not authenticated
          setReady(true);
          setSession(null);
          return;
        }
        
        setSession(data.session);
        initialFetchDone.current = true;
        setReady(true);
      } catch (error) {
        if (!mounted) return;
        console.error('Unexpected error fetching session:', error);
        setReady(true);
        setSession(null);
      }
    })();

    // Listen for auth state changes (login, logout, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      
      // Update session immediately when auth state changes
      setSession(newSession);
      
      // If initial fetch hasn't completed yet, mark as ready now
      // This handles the case where onAuthStateChange fires before getSession completes
      if (!initialFetchDone.current) {
        initialFetchDone.current = true;
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { ready, session };
}

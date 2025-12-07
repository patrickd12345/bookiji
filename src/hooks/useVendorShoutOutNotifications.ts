import { useState, useEffect } from 'react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'

export interface ShoutOutNotification {
  id: string
  customer_id: string
  customer_name: string
  service_request: string
  location: string
  radius: number
  budget?: number
  created_at: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
}

export const useVendorShoutOutNotifications = () => {
  const [notifications, setNotifications] = useState<ShoutOutNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase) {
      setError('Supabase client not available')
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shout_out_requests')
        .select(`
          id,
          customer_id,
          customer_name,
          service_request,
          location,
          radius,
          budget,
          created_at,
          status
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  const acceptShoutOut = async (id: string) => {
    const supabase = supabaseBrowserClient()
    if (!supabase) {
      setError('Supabase client not available')
      return { success: false, error: 'Supabase client not available' }
    }
    
    try {
      const { error } = await supabase
        .from('shout_out_requests')
        .update({ status: 'accepted' })
        .eq('id', id)

      if (error) throw error
      
      // Refresh notifications
      await fetchNotifications()
      return { success: true }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept shout out')
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  const declineShoutOut = async (id: string) => {
    const supabase = supabaseBrowserClient()
    if (!supabase) {
      setError('Supabase client not available')
      return { success: false, error: 'Supabase client not available' }
    }
    
    try {
      const { error } = await supabase
        .from('shout_out_requests')
        .update({ status: 'declined' })
        .eq('id', id)

      if (error) throw error
      
      // Refresh notifications
      await fetchNotifications()
      return { success: true }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline shout out')
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  return {
    notifications,
    loading,
    error,
    acceptShoutOut,
    declineShoutOut,
    refetch: fetchNotifications
  }
}


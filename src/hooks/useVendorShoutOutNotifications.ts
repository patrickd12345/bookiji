import { useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

interface UseVendorShoutOutNotificationsProps {
  vendorId: string
  onNewShoutOut?: (notification: any) => void
  enabled?: boolean
}

export function useVendorShoutOutNotifications({
  vendorId,
  onNewShoutOut,
  enabled = true
}: UseVendorShoutOutNotificationsProps) {
  
  const showNotificationToast = useCallback((payload: any) => {
    // Extract shout-out details from the notification
    const notification = payload.new
    
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Shout-Out Request!', {
        body: `A customer is looking for ${notification.metadata?.service_type || 'a service'} in your area.`,
        icon: '/icons/icon-144x144.svg',
        tag: `shout-out-${notification.shout_out_id}`,
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Request'
          }
        ]
      })
    }
    
    // Call custom handler if provided
    if (onNewShoutOut) {
      onNewShoutOut(notification)
    }
    
    // Show in-app toast/alert as fallback
    if (window.alert) {
      const confirmed = window.confirm(
        'New Shout-Out Request! A customer is looking for a service in your area. Open your dashboard to respond?'
      )
      if (confirmed) {
        window.location.href = '/vendor/shout-outs'
      }
    }
  }, [onNewShoutOut])

  useEffect(() => {
    if (!enabled || !vendorId) return

    const config = getSupabaseConfig()
    const supabase = createClient(config.url, config.publishableKey || config.anonKey)

    // Request notification permission on first use
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Subscribe to new shout-out notifications for this vendor
    const channel = supabase
      .channel(`shout_outs_vendor_${vendorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shout_out_notifications',
          filter: `vendor_id=eq.${vendorId} and channel=eq.in_app`
        },
        showNotificationToast
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel)
    }
  }, [vendorId, enabled, showNotificationToast])

  // Function to manually request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }, [])

  return {
    requestNotificationPermission
  }
}

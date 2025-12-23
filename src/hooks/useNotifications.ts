import { useState, useEffect, useCallback } from 'react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { Notification } from '@/types/notification'
import { NotificationService } from '@/lib/services/notificationService'

interface NotificationState {
  data: Notification[];
  isLoading: boolean;
  error: string | null;
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    data: [],
    isLoading: false,
    error: null
  })

  const notificationService = NotificationService.getInstance()

  const fetchNotifications = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    const supabase = supabaseBrowserClient()
    if (!supabase) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Supabase client not available' }))
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'User is not authenticated'
      }))
      return
    }

    try {
      const notifications = await notificationService.fetchNotifications(session.access_token)
      setState({
        data: notifications,
        isLoading: false,
        error: null
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load notifications'
      }))
    }
  }, [notificationService])

  const markAsRead = useCallback(async (notificationId: string) => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      await notificationService.markAsRead(notificationId, session.access_token)
      setState(prev => ({
        ...prev,
        data: prev.data.map(notification =>
          notification.id === notificationId

            ? { ...notification, read: true, read_at: new Date().toISOString() }

            : notification
        )
      }))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [notificationService])

  const markAllAsRead = useCallback(async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      await notificationService.markAllAsRead(session.access_token)
      const timestamp = new Date().toISOString()
      setState(prev => ({
        ...prev,

        data: prev.data.map(notification => ({ ...notification, read: true, read_at: timestamp }))

      }))
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [notificationService])

  const deleteNotification = useCallback(async (notificationId: string) => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      await notificationService.deleteNotification(notificationId, session.access_token)
      setState(prev => ({
        ...prev,
        data: prev.data.filter(notification => notification.id !== notificationId)
      }))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }, [notificationService])

  // Set up real-time notifications with reconnection logic
  useEffect(() => {
    let channel: ReturnType<NonNullable<ReturnType<typeof supabaseBrowserClient>>['channel']> | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let currentSupabase: ReturnType<typeof supabaseBrowserClient> | null = null
    let reconnectAttempts = 0
    let lastErrorTime = 0
    const MAX_RECONNECT_ATTEMPTS = 5
    const INITIAL_RECONNECT_DELAY = 2000 // 2 seconds
    const MAX_RECONNECT_DELAY = 30000 // 30 seconds
    let isSubscribed = false

    const subscribe = async () => {
      const supabase = supabaseBrowserClient()
      if (!supabase) return
      currentSupabase = supabase
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      // Clean up existing channel if any
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }

      try {
        channel = supabase
          .channel(`notifications-${session.user.id}`, {
            config: {
              broadcast: { self: false },
              presence: { key: session.user.id }
            }
          })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${session.user.id}`
            },
            (payload) => {
              setState(prev => ({
                ...prev,
                data: [payload.new as Notification, ...prev.data]
              }))
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${session.user.id}`
            },
            (payload) => {
              setState(prev => ({
                ...prev,
                data: prev.data.map(notification =>
                  notification.id === (payload.new as Notification).id
                    ? payload.new as Notification
                    : notification
                )
              }))
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${session.user.id}`
            },
            (payload) => {
              setState(prev => ({
                ...prev,
                data: prev.data.filter(notification => notification.id !== payload.old.id)
              }))
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              isSubscribed = true
              reconnectAttempts = 0 // Reset on successful subscription
              lastErrorTime = 0
            } else if (status === 'CHANNEL_ERROR') {
              isSubscribed = false
              // Only log if it's been more than 10 seconds since last error (avoid spam)
              const now = Date.now()
              if (now - lastErrorTime > 10000) {
                console.warn('Notifications real-time channel error. Will retry automatically.')
                lastErrorTime = now
              }
              if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                attemptReconnect()
              } else {
                console.warn('Max reconnection attempts reached. Real-time notifications disabled. Polling will continue.')
              }
            } else if (status === 'CLOSED') {
              isSubscribed = false
              // Only attempt reconnect if it wasn't intentionally closed
              if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                attemptReconnect()
              }
            } else if (status === 'TIMED_OUT') {
              isSubscribed = false
              if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                attemptReconnect()
              }
            }
          })
      } catch (error) {
        console.error('Failed to set up notifications channel:', error)
        isSubscribed = false
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          attemptReconnect()
        }
      }
    }

    const attemptReconnect = () => {
      if (reconnectTimeout) return
      
      reconnectAttempts++
      // Exponential backoff: 2s, 4s, 8s, 16s, 30s (max)
      const delay = Math.min(
        INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1),
        MAX_RECONNECT_DELAY
      )
      
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null
        const supabase = supabaseBrowserClient()
        if (!supabase) return
        
        subscribe()
      }, delay)
    }

    subscribe()

    return () => {
      if (channel && currentSupabase) {
        currentSupabase.removeChannel(channel)
        channel = null
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
      isSubscribed = false
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications: state.data,
    unreadCount: state.data.filter(n => !n.read).length,
    isLoading: state.isLoading,
    error: state.error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  }
} 
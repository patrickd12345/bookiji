import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
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
      const notifications = await notificationService.fetchNotifications()
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
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
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
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead()
      const timestamp = new Date().toISOString()
      setState(prev => ({
        ...prev,

        data: prev.data.map(notification => ({ ...notification, read: true, read_at: timestamp }))

      }))
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId)
      setState(prev => ({
        ...prev,
        data: prev.data.filter(notification => notification.id !== notificationId)
      }))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }, [])

  // Set up real-time notifications with reconnection logic
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

    const subscribe = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      channel = supabase
        .channel('notifications')
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
          if (status === 'CHANNEL_ERROR') {
            console.error('Notifications channel error')
            alert('Real-time connection lost. Reconnecting...')
            attemptReconnect()
          } else if (status === 'CLOSED') {
            console.warn('Notifications channel closed')
            alert('Real-time connection closed. Reconnecting...')
            attemptReconnect()
          }
        })
    }

    const attemptReconnect = () => {
      if (reconnectTimeout) return
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null
        if (channel) {
          supabase.removeChannel(channel)
          channel = null
        }
        subscribe()
      }, 5000)
    }

    subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
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
'use client'

import { useState, useEffect, useCallback } from 'react'
import { pushNotificationManager } from '@/lib/notifications/pushNotifications'

export interface PushSubscriptionState {
  isSupported: boolean
  isSubscribed: boolean
  isSubscribing: boolean
  error: string | null
}

/**
 * Hook for managing Web Push subscriptions
 */
export function usePushSubscription() {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isSubscribing: false,
    error: null
  })

  useEffect(() => {
    // Check if push is supported
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window
    setState(prev => ({ ...prev, isSupported }))

    if (isSupported) {
      checkSubscriptionStatus()
    }
  }, [])

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setState(prev => ({ ...prev, isSubscribed: !!subscription }))
      }
    } catch (error) {
      console.error('Error checking subscription status:', error)
      setState(prev => ({ ...prev, error: 'Failed to check subscription status' }))
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications are not supported' }))
      return false
    }

    setState(prev => ({ ...prev, isSubscribing: true, error: null }))

    try {
      // Get VAPID public key
      const vapidResponse = await fetch('/api/notifications/push/vapid-public-key')
      const { publicKey } = await vapidResponse.json()

      if (!publicKey) {
        throw new Error('VAPID public key not available')
      }

      // Register service worker
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      })

      const p256dhKey = subscription.getKey('p256dh')
      const authKey = subscription.getKey('auth')

      if (!p256dhKey || !authKey) {
        throw new Error('Push subscription keys missing')
      }

      // Send subscription to server
      const response = await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: uint8ArrayToBase64(new Uint8Array(p256dhKey)),
            auth: uint8ArrayToBase64(new Uint8Array(authKey))
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      setState(prev => ({ ...prev, isSubscribed: true, isSubscribing: false }))
      return true
    } catch (error) {
      console.error('Error subscribing to push:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to subscribe',
        isSubscribing: false
      }))
      return false
    }
  }, [state.isSupported])

  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isSubscribing: true, error: null }))

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Delete from server
        await fetch('/api/notifications/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        })

        // Unsubscribe from push
        await subscription.unsubscribe()
      }

      setState(prev => ({ ...prev, isSubscribed: false, isSubscribing: false }))
      return true
    } catch (error) {
      console.error('Error unsubscribing from push:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
        isSubscribing: false
      }))
      return false
    }
  }, [])

  return {
    ...state,
    subscribe,
    unsubscribe,
    refresh: checkSubscriptionStatus
  }
}

// Helper functions for VAPID key conversion
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function uint8ArrayToBase64(array: Uint8Array): string {
  const bytes = new Uint8Array(array)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}


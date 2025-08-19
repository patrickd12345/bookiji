// Web Push Notifications 2.0 Implementation
// Features: Service worker registration, notification preferences, batching, quiet hours

export interface PushNotificationPreferences {
  enabled: boolean
  types: {
    booking_updates: boolean
    messages: boolean
    reminders: boolean
    promotions: boolean
    system: boolean
  }
  quiet_hours: {
    enabled: boolean
    start: string // HH:mm format
    end: string // HH:mm format
    timezone: string
  }
  batching: {
    enabled: boolean
    max_delay: number // minutes
    max_batch_size: number
  }
}

export interface NotificationBatch {
  id: string
  notifications: Array<{
    id: string
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: Record<string, any>
    actions?: Array<{
      action: string
      title: string
      icon?: string
    }>
  }>
  created_at: Date
  expires_at: Date
}

class PushNotificationManager {
  private swRegistration: ServiceWorkerRegistration | null = null
  private preferences: PushNotificationPreferences
  private notificationQueue: Map<string, NotificationBatch> = new Map()
  private batchTimer: NodeJS.Timeout | null = null

  constructor() {
    this.preferences = this.getDefaultPreferences()
    this.loadPreferences()
    this.init()
  }

  private getDefaultPreferences(): PushNotificationPreferences {
    return {
      enabled: true,
      types: {
        booking_updates: true,
        messages: true,
        reminders: true,
        promotions: false,
        system: true
      },
      quiet_hours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      batching: {
        enabled: true,
        max_delay: 5, // 5 minutes
        max_batch_size: 10
      }
    }
  }

  private async init() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js')
        await this.requestPermission()
        this.setupMessageListener()
      } catch (error) {
        console.error('Push notification initialization failed:', error)
      }
    }
  }

  private async requestPermission(): Promise<boolean> {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }

  private setupMessageListener() {
    if (this.swRegistration) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data)
      })
    }
  }

  private handleServiceWorkerMessage(data: any) {
    switch (data.type) {
      case 'NOTIFICATION_CLICKED':
        this.handleNotificationClick(data.notification)
        break
      case 'NOTIFICATION_ACTION':
        this.handleNotificationAction(data.action, data.notification)
        break
      case 'PUSH_RECEIVED':
        this.handlePushReceived(data.payload)
        break
    }
  }

  private handleNotificationClick(notification: any) {
    // Handle notification click - focus window, navigate to relevant page
    if (notification.data?.url) {
      window.focus()
      window.location.href = notification.data.url
    }
  }

  private handleNotificationAction(action: string, notification: any) {
    // Handle notification action buttons
    switch (action) {
      case 'accept':
        this.handleAcceptAction(notification)
        break
      case 'decline':
        this.handleDeclineAction(notification)
        break
      case 'snooze':
        this.handleSnoozeAction(notification)
        break
    }
  }

  private handlePushReceived(payload: any) {
    // Handle push notification payload from service worker
    if (this.shouldShowNotification(payload)) {
      this.showNotification(payload)
    }
  }

  private shouldShowNotification(notification: any): boolean {
    if (!this.preferences.enabled) return false
    if (!this.preferences.types[notification.type as keyof typeof this.preferences.types]) return false
    if (this.isInQuietHours()) return false
    return true
  }

  private isInQuietHours(): boolean {
    if (!this.preferences.quiet_hours.enabled) return false

    const now = new Date()
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      timeZone: this.preferences.quiet_hours.timezone 
    })
    
    const start = this.preferences.quiet_hours.start
    const end = this.preferences.quiet_hours.end

    if (start <= end) {
      // Same day (e.g., 08:00 to 22:00)
      return currentTime >= start && currentTime <= end
    } else {
      // Overnight (e.g., 22:00 to 08:00)
      return currentTime >= start || currentTime <= end
    }
  }

  async showNotification(notification: any) {
    if (this.preferences.batching.enabled) {
      this.addToBatch(notification)
    } else {
      this.showImmediateNotification(notification)
    }
  }

  private addToBatch(notification: any) {
    const batchId = this.getCurrentBatchId()
    
    if (!this.notificationQueue.has(batchId)) {
      this.notificationQueue.set(batchId, {
        id: batchId,
        notifications: [],
        created_at: new Date(),
        expires_at: new Date(Date.now() + this.preferences.batching.max_delay * 60 * 1000)
      })
    }

    const batch = this.notificationQueue.get(batchId)!
    batch.notifications.push(notification)

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch(batchId)
      }, this.preferences.batching.max_delay * 60 * 1000)
    }

    // Process batch if it's full
    if (batch.notifications.length >= this.preferences.batching.max_batch_size) {
      this.processBatch(batchId)
    }
  }

  private getCurrentBatchId(): string {
    const now = new Date()
    const minutes = Math.floor(now.getTime() / (this.preferences.batching.max_delay * 60 * 1000))
    return `batch_${minutes}`
  }

  private processBatch(batchId: string) {
    const batch = this.notificationQueue.get(batchId)
    if (!batch) return

    if (batch.notifications.length === 1) {
      // Single notification - show immediately
      this.showImmediateNotification(batch.notifications[0])
    } else {
      // Multiple notifications - show batch
      this.showBatchNotification(batch)
    }

    this.notificationQueue.delete(batchId)
    
    // Clear timer if no more batches
    if (this.notificationQueue.size === 0 && this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
  }

  private async showImmediateNotification(notification: any) {
    if (!this.swRegistration) return

    try {
      await this.swRegistration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/icon-72x72.png',
        tag: notification.tag,
        data: notification.data,
        // actions: notification.actions, // Note: actions not supported in all browsers
        requireInteraction: notification.requireInteraction || false,
        silent: false
        // vibrate: [200, 100, 200] // Note: vibrate not supported in all browsers
      })
    } catch (error) {
      console.error('Failed to show notification:', error)
    }
  }

  private async showBatchNotification(batch: NotificationBatch) {
    if (!this.swRegistration) return

    const title = `You have ${batch.notifications.length} new notifications`
    const body = this.generateBatchBody(batch.notifications)

    try {
      await this.swRegistration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `batch_${batch.id}`,
        data: {
          type: 'batch',
          batch_id: batch.id,
          notifications: batch.notifications
        },
        // actions: [ // Note: actions not supported in all browsers
        //   {
        //     action: 'view_all',
        //     title: 'View All'
        //   },
        //   {
        //     action: 'dismiss',
        //     title: 'Dismiss'
        //   }
        // ],
        requireInteraction: true,
        silent: false
      })
    } catch (error) {
      console.error('Failed to show batch notification:', error)
    }
  }

  private generateBatchBody(notifications: any[]): string {
    const types = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {})

    const typeStrings = Object.entries(types).map(([type, count]) => 
      `${count} ${type.replace('_', ' ')}`
    )

    return typeStrings.join(', ')
  }

  // Public API methods
  async updatePreferences(newPreferences: Partial<PushNotificationPreferences>) {
    this.preferences = { ...this.preferences, ...newPreferences }
    this.savePreferences()
    
    // Update service worker with new preferences
    if (this.swRegistration) {
      this.swRegistration.active?.postMessage({
        type: 'UPDATE_PREFERENCES',
        preferences: this.preferences
      })
    }
  }

  getPreferences(): PushNotificationPreferences {
    return { ...this.preferences }
  }

  async testNotification() {
    const testNotification = {
      title: 'Test Notification',
      body: 'This is a test notification from Bookiji',
      type: 'system',
      data: { url: '/test' }
    }
    
    await this.showNotification(testNotification)
  }

  async clearAllNotifications() {
    if (this.swRegistration) {
      await this.swRegistration.getNotifications().then(notifications => {
        notifications.forEach(notification => notification.close())
      })
    }
  }

  private loadPreferences() {
    try {
      const stored = localStorage.getItem('push_notification_preferences')
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }

  private savePreferences() {
    try {
      localStorage.setItem('push_notification_preferences', JSON.stringify(this.preferences))
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
    }
  }

  // Action handlers
  private handleAcceptAction(notification: any) {
    // Handle accept action (e.g., accept booking request)
    console.log('Accept action for notification:', notification)
  }

  private handleDeclineAction(notification: any) {
    // Handle decline action (e.g., decline booking request)
    console.log('Decline action for notification:', notification)
  }

  private handleSnoozeAction(notification: any) {
    // Handle snooze action (e.g., remind later)
    console.log('Snooze action for notification:', notification)
  }
}

// Export singleton instance
export const pushNotificationManager = new PushNotificationManager()

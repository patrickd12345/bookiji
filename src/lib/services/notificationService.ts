import { Notification, NotificationResponse, NotificationError } from '@/types/notification'

export class NotificationService {
  private static instance: NotificationService
  private baseUrl = '/api/notifications'

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  async fetchNotifications(token: string): Promise<Notification[]> {
    const response = await fetch(this.baseUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response.ok) {
      const errorData = await response.json() as NotificationError
      throw new Error(errorData.error || 'Failed to fetch notifications')
    }
    const data = await response.json() as NotificationResponse
    return data.notifications
  }

  async markAsRead(notificationId: string, token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${notificationId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response.ok) {
      const errorData = await response.json() as NotificationError
      throw new Error(errorData.error || 'Failed to mark notification as read')
    }
  }

  async markAllAsRead(token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/mark-all-read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response.ok) {
      const errorData = await response.json() as NotificationError
      throw new Error(errorData.error || 'Failed to mark all notifications as read')
    }
  }

  async deleteNotification(notificationId: string, token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${notificationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response.ok) {
      const errorData = await response.json() as NotificationError
      throw new Error(errorData.error || 'Failed to delete notification')
    }
  }
} 
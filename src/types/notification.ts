// types/notification.ts
export enum NotificationType {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  SYSTEM_MESSAGE = 'SYSTEM_MESSAGE'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  read_at?: string;
  created_at: string;
  user_id: string;
}

export interface NotificationResponse {
  notifications: Notification[];
}

export interface NotificationError {
  error: string;
} 
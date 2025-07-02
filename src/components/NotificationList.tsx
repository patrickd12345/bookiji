import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { NotificationType } from '@/types/notification'
import { formatDistanceToNow } from 'date-fns'

export const NotificationList = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications()

  if (isLoading) {
    return <div className="p-4">Loading notifications...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  if (notifications.length === 0) {
    return <div className="p-4 text-gray-500">No notifications</div>
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.BOOKING_CONFIRMED:
        return '✅'
      case NotificationType.BOOKING_CANCELLED:
        return '❌'
      case NotificationType.PAYMENT_RECEIVED:
        return '💰'
      case NotificationType.REVIEW_RECEIVED:
        return '⭐'
      case NotificationType.SYSTEM_MESSAGE:
        return 'ℹ️'
      default:
        return '📬'
    }
  }

  return (
    <div className="flex flex-col max-h-96 sm:max-h-[32rem]">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-base font-semibold">
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </h2>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead()}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`flex items-start gap-3 p-4 transition-colors ${
              !notification.read ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-100'
            }`}
          >
            <span
              className={`text-2xl ${notification.read ? 'opacity-50 grayscale' : ''}`}
            >
              {getNotificationIcon(notification.type)}
            </span>

            <div className="flex-1">
              <p className="font-medium text-sm sm:text-base">
                {notification.title}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 leading-snug">
                {notification.message}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </div>

            <div className="flex-shrink-0 ml-2 space-x-1">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Mark as read"
                  onClick={() => markAsRead(notification.id)}
                >
                  ✓
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="Delete notification"
                onClick={() => deleteNotification(notification.id)}
              >
                🗑️
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
} 
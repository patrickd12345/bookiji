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
    <div className="space-y-4">
      <div className="flex justify-between items-center p-4">
        <h2 className="text-lg font-semibold">
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
      
      <div className="space-y-2">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`p-4 ${!notification.read ? 'bg-blue-50' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <span className="text-2xl">
                  {getNotificationIcon(notification.type)}
                </span>
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(notification.id)}
                  >
                    Mark as read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteNotification(notification.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
} 
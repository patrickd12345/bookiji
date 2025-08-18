'use client'

import React, { useState, useEffect } from 'react'
import { MessageSquare, X, Eye, Bell } from 'lucide-react'
import { useVendorShoutOutNotifications } from '@/hooks/useVendorShoutOutNotifications'

interface VendorNotificationToastProps {
  vendorId: string
  enabled?: boolean
}

interface ToastNotification {
  id: string
  title: string
  message: string
  shoutOutId: string
  timestamp: Date
}

export default function VendorNotificationToast({ 
  vendorId, 
  enabled = true 
}: VendorNotificationToastProps) {
  const [notifications, setNotifications] = useState<ToastNotification[]>([])
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted')
      setShowPermissionPrompt(Notification.permission === 'default')
    }
  }, [])

  const handleNewShoutOut = (notification: any) => {
    const toast: ToastNotification = {
      id: notification.id,
      title: 'New Shout-Out Request!',
      message: `A customer is looking for ${notification.metadata?.service_type || 'a service'} in your area.`,
      shoutOutId: notification.shout_out_id,
      timestamp: new Date()
    }

    setNotifications(prev => [toast, ...prev.slice(0, 4)]) // Keep max 5 notifications

    // Auto-remove after 10 seconds
    setTimeout(() => {
      removeNotification(toast.id)
    }, 10000)
  }

  const { requestNotificationPermission } = useVendorShoutOutNotifications({
    vendorId,
    onNewShoutOut: handleNewShoutOut,
    enabled: enabled && permissionGranted
  })

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleViewShoutOut = (shoutOutId: string, notificationId: string) => {
    removeNotification(notificationId)
    window.open(`/vendor/shout-outs?highlight=${shoutOutId}`, '_blank')
  }

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission()
    setPermissionGranted(granted)
    setShowPermissionPrompt(false)
  }

  if (!enabled) return null

  return (
    <>
      {/* Permission Prompt */}
      {showPermissionPrompt && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium">Enable Notifications</h4>
              <p className="text-sm text-blue-100 mt-1">
                Get instant alerts when customers send shout-out requests
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleRequestPermission}
                  className="text-xs bg-white text-blue-600 px-3 py-1 rounded font-medium hover:bg-blue-50"
                >
                  Enable
                </button>
                <button
                  onClick={() => setShowPermissionPrompt(false)}
                  className="text-xs text-blue-100 hover:text-white"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowPermissionPrompt(false)}
              className="text-blue-100 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Notification Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-slide-in-right"
            style={{ 
              animationDelay: `${index * 100}ms`,
              transform: `translateY(${index * 4}px)`,
              zIndex: 50 - index
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-sm">
                  {notification.title}
                </h4>
                <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              </div>

              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleViewShoutOut(notification.shoutOutId, notification.id)}
                className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-medium hover:bg-blue-700 transition-colors"
              >
                <Eye className="h-3 w-3" />
                View Request
              </button>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2"
              >
                Dismiss
              </button>
            </div>

            {/* Progress bar for auto-dismiss */}
            <div className="mt-2 w-full bg-gray-200 rounded-full h-0.5">
              <div 
                className="bg-blue-600 h-0.5 rounded-full animate-progress-bar"
                style={{ animationDuration: '10s' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progress-bar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }

        .animate-progress-bar {
          animation: progress-bar 10s linear;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  )
}

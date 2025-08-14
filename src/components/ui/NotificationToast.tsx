'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
}

interface NotificationToastProps {
  notification: Notification
  onDismissAction: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

const notificationConfig = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    iconColor: 'text-green-600'
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-600'
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-600'
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    iconColor: 'text-yellow-600'
  }
}

export function NotificationToast({ 
  notification, 
  onDismissAction
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const config = notificationConfig[notification.type]
  const Icon = config.icon

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => {
      onDismissAction(notification.id)
      notification.onDismiss?.()
    }, 300)
  }, [notification.id, notification.onDismiss, onDismissAction])

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, notification.duration)

      return () => clearTimeout(timer)
    }
  }, [notification.duration, handleDismiss])

  const handleAction = useCallback(() => {
    notification.action?.onClick()
    handleDismiss()
  }, [notification.action, handleDismiss])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'max-w-sm w-full bg-white rounded-lg shadow-lg border p-4',
            config.bg,
            config.border
          )}
        >
          <div className="flex items-start gap-3">
            <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.iconColor)} />
            
            <div className="flex-1 min-w-0">
              {notification.title && (
                <h4 className={cn('font-medium mb-1', config.text)}>
                  {notification.title}
                </h4>
              )}
              
              <p className={cn('text-sm', config.text)}>
                {notification.message}
              </p>
              
              {notification.action && (
                <button
                  onClick={handleAction}
                  className={cn(
                    'mt-2 text-xs font-medium underline hover:no-underline',
                    config.text
                  )}
                >
                  {notification.action.label}
                </button>
              )}
            </div>
            
            <button
              onClick={handleDismiss}
              className={cn(
                'p-1 rounded-full hover:bg-black/10 transition-colors',
                config.text
              )}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Notification container that manages multiple notifications
interface NotificationContainerProps {
  notifications: Notification[]
  onDismissAction: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  maxNotifications?: number
}

export function NotificationContainer({
  notifications,
  onDismissAction,
  position = 'top-right',
  maxNotifications = 5
}: NotificationContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  }

  const displayNotifications = notifications.slice(0, maxNotifications)

  return (
    <div className={cn(
      'fixed z-50 space-y-2',
      positionClasses[position]
    )}>
      {displayNotifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismissAction={onDismissAction}
          position={position}
        />
      ))}
    </div>
  )
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString()
    const newNotification = { ...notification, id }
    
    setNotifications(prev => [newNotification, ...prev])
    
    return id
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const showSuccess = useCallback((message: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'success',
      message,
      duration: 5000,
      ...options
    })
  }, [addNotification])

  const showError = useCallback((message: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'error',
      message,
      duration: 8000,
      ...options
    })
  }, [addNotification])

  const showInfo = useCallback((message: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'info',
      message,
      duration: 4000,
      ...options
    })
  }, [addNotification])

  const showWarning = useCallback((message: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'warning',
      message,
      duration: 6000,
      ...options
    })
  }, [addNotification])

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showInfo,
    showWarning
  }
}

// Convenience components for quick notifications
export function QuickNotification({ 
  type, 
  message, 
  duration = 4000,
  onDismiss
}: {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
  onDismiss?: () => void
}) {
  const { addNotification } = useNotifications()
  
  useEffect(() => {
    addNotification({
      type,
      message,
      duration,
      onDismiss
    })
    
    return () => {
      // Cleanup if component unmounts
    }
  }, [type, message, duration, onDismiss, addNotification])

  return null
}

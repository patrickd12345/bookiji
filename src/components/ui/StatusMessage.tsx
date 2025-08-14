import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface StatusMessageProps {
  type: 'success' | 'info' | 'warning'
  title?: string
  message: string
  autoDismiss?: boolean
  dismissDelay?: number
  onDismiss?: () => void
  className?: string
  showIcon?: boolean
  actions?: React.ReactNode
}

const statusConfig = {
  success: {
    icon: '✅',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    title: 'Success'
  },
  info: {
    icon: 'ℹ️',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    title: 'Information'
  },
  warning: {
    icon: '⚠️',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    title: 'Warning'
  }
}

export function StatusMessage({
  type,
  title,
  message,
  autoDismiss = false,
  dismissDelay = 5000,
  onDismiss,
  className = '',
  showIcon = true,
  actions
}: StatusMessageProps) {
  const [visible, setVisible] = useState(true)
  const config = statusConfig[type]

  useEffect(() => {
    if (autoDismiss && dismissDelay > 0) {
      const timer = setTimeout(() => {
        setVisible(false)
        onDismiss?.()
      }, dismissDelay)

      return () => clearTimeout(timer)
    }
  }, [autoDismiss, dismissDelay, onDismiss])

  const handleDismiss = () => {
    setVisible(false)
    onDismiss?.()
  }

  if (!visible) return null

  return (
    <div className={cn(
      'rounded-lg border p-4 relative',
      config.bg,
      config.border,
      className
    )}>
      <div className="flex items-start gap-3">
        {showIcon && (
          <div className="text-lg flex-shrink-0">{config.icon}</div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-medium mb-1', config.text)}>
            {title || config.title}
          </h3>
          <p className={cn('text-sm', config.text)}>
            {message}
          </p>
          
          {actions && (
            <div className="flex items-center gap-2 mt-3">
              {actions}
            </div>
          )}
        </div>
        
        {(onDismiss || autoDismiss) && (
          <button
            onClick={handleDismiss}
            className={cn(
              'text-lg p-1 rounded-full hover:bg-black/10 transition-colors',
              config.text
            )}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

// Convenience components for common status scenarios
export function SuccessMessage({ 
  message, 
  title, 
  className = '',
  ...props 
}: { 
  message: string
  title?: string
  className?: string
  [key: string]: unknown
}) {
  return (
    <StatusMessage
      type="success"
      message={message}
      title={title}
      className={className}
      {...props}
    />
  )
}

export function InfoMessage({ 
  message, 
  title, 
  className = '',
  ...props 
}: { 
  message: string
  title?: string
  className?: string
  [key: string]: unknown
}) {
  return (
    <StatusMessage
      type="info"
      message={message}
      title={title}
      className={className}
      {...props}
    />
  )
}

export function WarningMessage({ 
  message, 
  title, 
  className = '',
  ...props 
}: { 
  message: string
  title?: string
  className?: string
  [key: string]: unknown
}) {
  return (
    <StatusMessage
      type="warning"
      message={message}
      title={title}
      className={className}
      {...props}
    />
  )
}

// Toast-style message for temporary notifications
export function ToastMessage({ 
  type, 
  message, 
  className = '',
  ...props 
}: { 
  type: 'success' | 'info' | 'warning'
  message: string
  className?: string
  [key: string]: unknown
}) {
  return (
    <StatusMessage
      type={type}
      message={message}
      className={cn('shadow-lg', className)}
      autoDismiss
      dismissDelay={3000}
      {...props}
    />
  )
}

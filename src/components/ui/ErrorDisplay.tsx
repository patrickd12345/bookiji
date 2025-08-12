import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface ErrorDisplayProps {
  error: string | Error
  severity?: 'info' | 'warning' | 'error' | 'critical'
  title?: string
  showRetry?: boolean
  showDetails?: boolean
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  actions?: React.ReactNode
}

const severityConfig = {
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
  },
  error: {
    icon: '❌',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    title: 'Error'
  },
  critical: {
    icon: '🚨',
    bg: 'bg-red-100',
    border: 'border-red-300',
    text: 'text-red-900',
    title: 'Critical Error'
  }
}

export function ErrorDisplay({
  error,
  severity = 'error',
  title,
  showRetry = false,
  showDetails = false,
  onRetry,
  onDismiss,
  className = '',
  actions
}: ErrorDisplayProps) {
  const [expanded, setExpanded] = useState(false)
  const config = severityConfig[severity]
  const errorMessage = error instanceof Error ? error.message : error
  const errorStack = error instanceof Error ? error.stack : undefined

  return (
    <div className={cn(
      'rounded-lg border p-4',
      config.bg,
      config.border,
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="text-lg">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-medium mb-1', config.text)}>
            {title || config.title}
          </h3>
          <p className={cn('text-sm', config.text)}>
            {errorMessage}
          </p>
          
          {showDetails && errorStack && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                {expanded ? 'Hide details' : 'Show details'}
              </button>
              {expanded && (
                <pre className="mt-2 text-xs bg-black/10 p-2 rounded overflow-x-auto">
                  {errorStack}
                </pre>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-3">
            {showRetry && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="text-xs"
              >
                Try Again
              </Button>
            )}
            
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-xs"
              >
                Dismiss
              </Button>
            )}
            
            {actions}
          </div>
        </div>
      </div>
    </div>
  )
}

// Convenience components for common error scenarios
export function NetworkError({ 
  error, 
  onRetry, 
  className = '' 
}: { 
  error: string | Error
  onRetry?: () => void
  className?: string 
}) {
  return (
    <ErrorDisplay
      error={error}
      severity="error"
      title="Network Error"
      showRetry={!!onRetry}
      onRetry={onRetry}
      className={className}
    />
  )
}

export function ValidationError({ 
  error, 
  className = '' 
}: { 
  error: string | Error
  className?: string 
}) {
  return (
    <ErrorDisplay
      error={error}
      severity="warning"
      title="Validation Error"
      className={className}
    />
  )
}

export function SystemError({ 
  error, 
  onRetry, 
  className = '' 
}: { 
  error: string | Error
  onRetry?: () => void
  className?: string 
}) {
  return (
    <ErrorDisplay
      error={error}
      severity="critical"
      title="System Error"
      showRetry={!!onRetry}
      showDetails
      onRetry={onRetry}
      className={className}
    />
  )
}

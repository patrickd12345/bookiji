'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Handle chunk loading errors gracefully (network issues, code splitting)
    if (error.name === 'ChunkLoadError' || error.message?.includes('chunk') || error.message?.includes('Loading chunk')) {
      console.warn('Chunk loading error detected, will retry on next navigation:', error.message)
      // Don't show error UI for chunk loading errors - they're usually transient
      return { hasError: false }
    }
    
    // Handle lazy component errors
    if (error.message?.includes('Lazy component') || error.message?.includes('lazy')) {
      console.warn('Lazy component loading error:', error.message)
      // These are usually recoverable, don't show error UI
      return { hasError: false }
    }
    
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Send to Sentry if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        })
      } catch (sentryError) {
        console.warn('Failed to send error to Sentry:', sentryError)
      }
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return React.createElement(this.props.fallback, {
          error: this.state.error!,
          resetError: this.resetError,
        })
      }

      return <DefaultErrorFallback error={this.state.error!} resetError={this.resetError} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  // Use useEffect with error tracking - ensure hooks are always called
  React.useEffect(() => {
    // Track error asynchronously to avoid blocking render
    const trackErrorAsync = async () => {
      try {
        const response = await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: 'error_occurred',
            properties: {
              error: error.message,
              context: {
                stack: error.stack,
                name: error.name,
                component: 'ErrorBoundary',
              },
              url: typeof window !== 'undefined' ? window.location.href : undefined,
            },
          }),
        })
        if (!response.ok) {
          console.warn('Analytics tracking failed:', response.status)
        }
      } catch (err) {
        // Silently fail - don't break error UI
        if (process.env.NODE_ENV === 'development') {
          console.warn('Analytics tracking error:', err)
        }
      }
    }
    trackErrorAsync()
  }, [error.message, error.stack, error.name])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We encountered an unexpected error. Our team has been notified.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Error details (development only)
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex space-x-2">
            <Button onClick={resetError} variant="outline" size="sm">
              Try again
            </Button>
            <Button onClick={() => window.location.reload()} size="sm">
              Reload page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Wrapper component to provide hooks context
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundaryClass {...props} />
}

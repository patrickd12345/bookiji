import React from 'react'
import { LoadingSpinner, PageLoader, CardLoader } from './LoadingSpinner'
import { ErrorDisplay } from './ErrorDisplay'
import { SuccessMessage } from './StatusMessage'
import { cn } from '@/lib/utils'

interface AsyncWrapperProps {
  children: React.ReactNode
  loading?: boolean
  error?: string | Error | null
  success?: boolean
  successMessage?: string
  loadingText?: string
  errorTitle?: string
  showRetry?: boolean
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  loadingVariant?: 'page' | 'card' | 'inline' | 'spinner'
  errorSeverity?: 'info' | 'warning' | 'error' | 'critical'
  emptyState?: React.ReactNode
  showEmptyState?: boolean
  isEmpty?: boolean
}

export function AsyncWrapper({
  children,
  loading = false,
  error = null,
  success = false,
  successMessage,
  loadingText = 'Loading...',
  errorTitle,
  showRetry = false,
  onRetry,
  onDismiss,
  className = '',
  loadingVariant = 'spinner',
  errorSeverity = 'error',
  emptyState,
  showEmptyState = false,
  isEmpty = false
}: AsyncWrapperProps) {
  // Show loading state
  if (loading) {
    switch (loadingVariant) {
      case 'page':
        return <PageLoader text={loadingText} />
      case 'card':
        return <CardLoader text={loadingText} />
      case 'inline':
        return (
          <div className="flex items-center justify-center p-4">
            <LoadingSpinner size="md" text={loadingText} showText />
          </div>
        )
      case 'spinner':
      default:
        return (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" text={loadingText} showText />
          </div>
        )
    }
  }

  // Show error state
  if (error) {
    return (
      <div className={cn('p-4', className)}>
        <ErrorDisplay
          error={error}
          severity={errorSeverity}
          title={errorTitle}
          showRetry={showRetry}
          onRetry={onRetry}
          onDismiss={onDismiss}
        />
      </div>
    )
  }

  // Show empty state
  if (showEmptyState && isEmpty && emptyState) {
    return <div className={cn('p-4', className)}>{emptyState}</div>
  }

  // Show success message if provided
  if (success && successMessage) {
    return (
      <div className={cn('space-y-4', className)}>
        <SuccessMessage 
          message={successMessage}
          autoDismiss
          className="mb-4"
        />
        {children}
      </div>
    )
  }

  // Show children (normal state)
  return <div className={className}>{children}</div>
}

// Specialized wrappers for common use cases
export function LoadingWrapper({ 
  children, 
  loading, 
  loadingText = 'Loading...',
  variant = 'spinner',
  className = '' 
}: {
  children: React.ReactNode
  loading: boolean
  loadingText?: string
  variant?: 'page' | 'card' | 'inline' | 'spinner'
  className?: string
}) {
  return (
    <AsyncWrapper
      loading={loading}
      loadingText={loadingText}
      loadingVariant={variant}
      className={className}
    >
      {children}
    </AsyncWrapper>
  )
}

export function ErrorWrapper({ 
  children, 
  error, 
  onRetry,
  severity = 'error',
  className = '' 
}: {
  children: React.ReactNode
  error: string | Error | null
  onRetry?: () => void
  severity?: 'info' | 'warning' | 'error' | 'critical'
  className?: string
}) {
  return (
    <AsyncWrapper
      error={error}
      errorSeverity={severity}
      showRetry={!!onRetry}
      onRetry={onRetry}
      className={className}
    >
      {children}
    </AsyncWrapper>
  )
}

export function SuccessWrapper({ 
  children, 
  success, 
  message,
  className = '' 
}: {
  children: React.ReactNode
  success: boolean
  message?: string
  className?: string
}) {
  return (
    <AsyncWrapper
      success={success}
      successMessage={message}
      className={className}
    >
      {children}
    </AsyncWrapper>
  )
}

// Wrapper for API operations with loading, error, and success states
export function APIWrapper({ 
  children, 
  loading, 
  error, 
  success, 
  onRetry,
  loadingText = 'Loading...',
  successMessage,
  className = '' 
}: {
  children: React.ReactNode
  loading: boolean
  error: string | Error | null
  success?: boolean
  onRetry?: () => void
  loadingText?: string
  successMessage?: string
  className?: string
}) {
  return (
    <AsyncWrapper
      loading={loading}
      error={error}
      success={success}
      successMessage={successMessage}
      loadingText={loadingText}
      showRetry={!!onRetry}
      onRetry={onRetry}
      className={className}
    >
      {children}
    </AsyncWrapper>
  )
}

// Wrapper for data fetching operations
export function DataWrapper<T>({ 
  children, 
  data, 
  loading, 
  error, 
  onRetry,
  loadingText = 'Loading data...',
  emptyState,
  className = '' 
}: {
  children: (data: T) => React.ReactNode
  data: T | null | undefined
  loading: boolean
  error: string | Error | null
  onRetry?: () => void
  loadingText?: string
  emptyState?: React.ReactNode
  className?: string
}) {
  return (
    <AsyncWrapper
      loading={loading}
      error={error}
      showRetry={!!onRetry}
      onRetry={onRetry}
      loadingText={loadingText}
      emptyState={emptyState}
      showEmptyState={true}
      isEmpty={!data}
      className={className}
    >
      {data && children(data)}
    </AsyncWrapper>
  )
}

// Wrapper for form submissions
export function FormWrapper({ 
  children, 
  submitting, 
  error, 
  success, 
  onRetry,
  loadingText = 'Submitting...',
  successMessage = 'Form submitted successfully!',
  className = '' 
}: {
  children: React.ReactNode
  submitting: boolean
  error: string | Error | null
  success?: boolean
  onRetry?: () => void
  loadingText?: string
  successMessage?: string
  className?: string
}) {
  return (
    <AsyncWrapper
      loading={submitting}
      error={error}
      success={success}
      successMessage={successMessage}
      loadingText={loadingText}
      showRetry={!!onRetry}
      onRetry={onRetry}
      className={className}
    >
      {children}
    </AsyncWrapper>
  )
}

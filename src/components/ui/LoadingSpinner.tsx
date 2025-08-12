import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'white' | 'gray'
  className?: string
  text?: string
  showText?: boolean
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
}

const variantClasses = {
  primary: 'border-blue-600 border-t-transparent',
  secondary: 'border-purple-600 border-t-transparent',
  white: 'border-white border-t-transparent',
  gray: 'border-gray-400 border-t-transparent'
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'primary', 
  className = '',
  text,
  showText = false
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div 
        className={cn(
          'border-2 rounded-full animate-spin',
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      {showText && text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  )
}

// Convenience components for common use cases
export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <LoadingSpinner size="xl" variant="primary" text={text} showText />
    </div>
  )
}

export function CardLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="p-8 flex items-center justify-center">
      <LoadingSpinner size="lg" variant="primary" text={text} showText />
    </div>
  )
}

export function InlineLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size="sm" variant="primary" />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  )
}

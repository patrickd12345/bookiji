import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
  width?: number | string
  height?: number | string
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  animated?: boolean
}

export function LoadingSkeleton({
  className,
  width,
  height,
  rounded = 'md',
  animated = true
}: LoadingSkeletonProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }

  return (
    <div
      className={cn(
        'bg-gray-200',
        roundedClasses[rounded],
        animated && 'animate-pulse',
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  )
}

// Predefined skeleton components for common use cases
export function TextSkeleton({ 
  lines = 1, 
  className = '' 
}: { 
  lines?: number
  className?: string 
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <LoadingSkeleton
          key={i}
          height={16}
          width={i === lines - 1 ? '80%' : '100%'}
          className="h-4"
        />
      ))}
    </div>
  )
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={cn('p-6 border rounded-lg', className)}>
      <div className="flex items-center space-x-4 mb-4">
        <LoadingSkeleton width={48} height={48} rounded="full" />
        <div className="flex-1">
          <LoadingSkeleton height={20} width="60%" className="mb-2" />
          <LoadingSkeleton height={16} width="40%" />
        </div>
      </div>
      <TextSkeleton lines={3} />
    </div>
  )
}

export function ButtonSkeleton({ 
  size = 'md',
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'h-8 px-3',
    md: 'h-10 px-4',
    lg: 'h-12 px-6'
  }

  return (
    <LoadingSkeleton
      className={cn(
        'inline-block',
        sizeClasses[size],
        className
      )}
    />
  )
}

export function GridSkeleton({ 
  rows = 3, 
  cols = 3, 
  className = '' 
}: { 
  rows?: number
  cols?: number
  className?: string 
}) {
  return (
    <div className={cn('grid gap-4', className)} style={{
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
    }}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TableSkeleton({ 
  rows = 5, 
  cols = 4, 
  className = '' 
}: { 
  rows?: number
  cols?: number
  className?: string 
}) {
  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b">
        <div className="flex space-x-4">
          {Array.from({ length: cols }).map((_, i) => (
            <LoadingSkeleton key={i} height={20} width="100px" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 border-b last:border-b-0">
          <div className="flex space-x-4">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <LoadingSkeleton 
                key={colIndex} 
                height={16} 
                width={colIndex === 0 ? "120px" : "80px"} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

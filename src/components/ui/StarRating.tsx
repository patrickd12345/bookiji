'use client'

import React, { useState, useCallback } from 'react'

export interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'small' | 'normal' | 'large'
  showValue?: boolean
  className?: string
  allowHalfStars?: boolean
}

export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'normal',
  showValue = true,
  className = '',
  allowHalfStars = true
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const [isHovering, setIsHovering] = useState(false)

  const sizeClasses = {
    small: 'w-4 h-4',
    normal: 'w-5 h-5',
    large: 'w-6 h-6'
  }

  const textSizeClasses = {
    small: 'text-xs',
    normal: 'text-sm',
    large: 'text-base'
  }

  const handleStarClick = useCallback((starValue: number) => {
    if (!readonly && onChange) {
      onChange(starValue)
    }
  }, [readonly, onChange])

  const handleStarHover = useCallback((starValue: number) => {
    if (!readonly) {
      setHoverValue(starValue)
      setIsHovering(true)
    }
  }, [readonly])

  const handleMouseLeave = useCallback(() => {
    if (!readonly) {
      setIsHovering(false)
      setHoverValue(null)
    }
  }, [readonly])

  const getStarValue = (index: number): number => {
    return index + 1
  }

  const getHalfStarValue = (index: number): number => {
    return index + 0.5
  }

  const getStarFill = (index: number): 'full' | 'half' | 'empty' => {
    const displayValue = isHovering && hoverValue !== null ? hoverValue : value
    const fullStarValue = getStarValue(index)
    const halfStarValue = getHalfStarValue(index)

    if (displayValue >= fullStarValue) {
      return 'full'
    } else if (allowHalfStars && displayValue >= halfStarValue) {
      return 'half'
    } else {
      return 'empty'
    }
  }

  const renderStar = (index: number) => {
    const fillType = getStarFill(index)
    const starClass = `${sizeClasses[size]} ${
      readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
    } transition-all duration-200`

    if (fillType === 'full') {
      return (
        <svg
          key={index}
          className={`${starClass} text-yellow-400 fill-current`}
          viewBox="0 0 20 20"
          onClick={() => handleStarClick(getStarValue(index))}
          onMouseEnter={() => handleStarHover(getStarValue(index))}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    } else if (fillType === 'half' && allowHalfStars) {
      return (
        <div key={index} className="relative">
          <svg
            className={`${starClass} text-yellow-400 fill-current absolute inset-0`}
            viewBox="0 0 20 20"
            onClick={() => handleStarClick(getHalfStarValue(index))}
            onMouseEnter={() => handleStarHover(getHalfStarValue(index))}
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <div className="absolute inset-0 overflow-hidden">
            <svg
              className={`${starClass} text-yellow-400 fill-current`}
              viewBox="0 0 20 20"
              style={{ clipPath: 'inset(0 50% 0 0)' }}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>
      )
    } else {
      return (
        <svg
          key={index}
          className={`${starClass} text-gray-300 hover:text-yellow-200`}
          viewBox="0 0 20 20"
          onClick={() => handleStarClick(getStarValue(index))}
          onMouseEnter={() => handleStarHover(getStarValue(index))}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    }
  }

  const formatValue = (val: number): string => {
    if (allowHalfStars && val % 1 !== 0) {
      return val.toFixed(1)
    }
    return Math.round(val).toString()
  }

  return (
    <div 
      className={`flex items-center gap-1 ${className}`}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="relative">
          {renderStar(index)}
        </div>
      ))}
      
      {showValue && value > 0 && (
        <span className={`ml-2 text-gray-600 ${textSizeClasses[size]}`}>
          {formatValue(value)}/5
        </span>
      )}
    </div>
  )
}

// Export a simplified version for backward compatibility
export function SimpleStarRating({ 
  value, 
  onChange, 
  readonly = false,
  size = 'normal' 
}: Omit<StarRatingProps, 'showValue' | 'className' | 'allowHalfStars'>) {
  return (
    <StarRating
      value={value}
      onChange={onChange}
      readonly={readonly}
      size={size}
      showValue={false}
      allowHalfStars={false}
    />
  )
}

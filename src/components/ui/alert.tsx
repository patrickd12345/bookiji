'use client'

import * as React from 'react'

interface AlertProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'destructive' | 'warning'
}

export function Alert({ children, className, variant = 'default' }: AlertProps) {
  const variantClasses = {
    default: 'border-blue-200 bg-blue-50 text-blue-800',
    destructive: 'border-red-200 bg-red-50 text-red-800', 
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800'
  }

  return (
    <div className={`rounded-lg border p-4 ${variantClasses[variant]} ${className || ''}`}>
      {children}
    </div>
  )
}

interface AlertDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function AlertDescription({ children, className }: AlertDescriptionProps) {
  return (
    <div className={`text-sm ${className || ''}`}>
      {children}
    </div>
  )
}

interface AlertTitleProps {
  children: React.ReactNode
  className?: string
}

export function AlertTitle({ children, className }: AlertTitleProps) {
  return (
    <h5 className={`font-medium leading-none tracking-tight mb-1 ${className || ''}`}>
      {children}
    </h5>
  )
}


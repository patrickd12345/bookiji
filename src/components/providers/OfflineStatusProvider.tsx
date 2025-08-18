"use client"

import { ReactNode } from 'react'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'

interface OfflineStatusProviderProps {
  children: ReactNode
}

export function OfflineStatusProvider({ children }: OfflineStatusProviderProps) {
  useOfflineStatus()
  return <>{children}</>
}

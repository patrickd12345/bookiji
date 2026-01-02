'use client'

import React, { ReactNode } from 'react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { GuidedTourProvider } from '@/components/guided-tours/GuidedTourProvider'

interface RootLayoutWrapperProps {
  children: ReactNode
}

export default function RootLayoutWrapper({ children }: RootLayoutWrapperProps) {
  return (
    <ThemeProvider>
      <GuidedTourProvider>{children}</GuidedTourProvider>
    </ThemeProvider>
  )
}

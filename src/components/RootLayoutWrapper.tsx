'use client'

import dynamic from 'next/dynamic'
import { ReactNode, Suspense } from 'react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { GuidedTourProvider } from '@/components/guided-tours/GuidedTourProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Dynamically import to defer Supabase initialization
const MainNavigation = dynamic(() => import('@/components/MainNavigation'), { ssr: false })

interface RootLayoutWrapperProps {
  children: ReactNode
}

export default function RootLayoutWrapper({ children }: RootLayoutWrapperProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <GuidedTourProvider>
          <Suspense fallback={null}>
            <MainNavigation />
          </Suspense>
          {children}
        </GuidedTourProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}


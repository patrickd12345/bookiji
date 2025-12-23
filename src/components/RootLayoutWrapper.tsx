'use client'

import dynamic from 'next/dynamic'
import { ReactNode, Suspense } from 'react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { GuidedTourProvider } from '@/components/guided-tours/GuidedTourProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Dynamically import to defer Supabase initialization
const MainNavigation = dynamic(() => import('@/components/MainNavigation'), { ssr: false })
const Footer = dynamic(() => import('@/components/Footer'), { ssr: false })
const ConsentManager = dynamic(() => import('@/components/ConsentManager').then(mod => ({ default: mod.ConsentManager })), { ssr: false })

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
          <div className="flex flex-col min-h-screen">
            {children}
            <Suspense fallback={null}>
              <Footer />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <ConsentManager />
          </Suspense>
        </GuidedTourProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}


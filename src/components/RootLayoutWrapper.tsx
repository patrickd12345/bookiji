'use client'

import dynamic from 'next/dynamic'
import React, { ReactNode, Suspense } from 'react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { GuidedTourProvider } from '@/components/guided-tours/GuidedTourProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Dynamically import to defer Supabase initialization
// Use explicit default import to avoid chunk loading errors
// Add error handling for chunk loading failures
const MainNavigation = dynamic(
  () => import('@/components/MainNavigation')
    .then(mod => ({ default: mod.default }))
    .catch((error) => {
      console.warn('Failed to load MainNavigation:', error)
      // Return a fallback component
      return { default: () => null }
    }),
  { 
    ssr: false,
    loading: () => null // Show nothing while loading to avoid layout shift
  }
)
const Footer = dynamic(
  () => import('@/components/Footer')
    .then(mod => ({ default: mod.default }))
    .catch((error) => {
      console.warn('Failed to load Footer:', error)
      return { default: () => null }
    }),
  { 
    ssr: false,
    loading: () => null
  }
)
const ConsentManager = dynamic(
  () => import('@/components/ConsentManager').then(mod => {
    // Wrap named export as default for dynamic import
    const WrappedConsentManager = () => {
      const Component = mod.ConsentManager
      return <Component />
    }
    return { default: WrappedConsentManager }
  }),
  { 
    ssr: false,
    loading: () => null
  }
)

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


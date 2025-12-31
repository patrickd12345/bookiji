'use client'

import dynamic from 'next/dynamic'
import React, { ReactNode, Suspense } from 'react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { GuidedTourProvider } from '@/components/guided-tours/GuidedTourProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LogoutButton } from '@/components/LogoutButton'

// Dynamically import to defer Supabase initialization
// Use explicit default import to avoid chunk loading errors
// Add error handling for chunk loading failures with retry logic
const loadMainNavigationWithRetry = async (retries = 2): Promise<{ default: React.ComponentType }> => {
  try {
    const mod = await import('@/components/MainNavigation')
    return { default: mod.default }
  } catch (error) {
    console.error('Failed to load MainNavigation chunk:', error)
    
    // Retry if attempts remaining
    if (retries > 0) {
      console.log(`Retrying MainNavigation load (${retries} attempts remaining)...`)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s before retry
      return loadMainNavigationWithRetry(retries - 1)
    }
    
    // Final fallback: return a minimal navigation placeholder
    console.warn('MainNavigation failed to load after retries, using fallback')
    return {
      default: () => (
        <nav className="bg-background border-b border-border" data-test="main-nav-fallback">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <a href="/" className="text-xl font-bold text-primary">Bookiji</a>
              <div className="text-sm text-muted-foreground">Navigation loading...</div>
            </div>
          </div>
        </nav>
      )
    }
  }
}

const MainNavigation = dynamic(
  () => loadMainNavigationWithRetry(),
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
          {/* Floating logout button - always visible when logged in */}
          <LogoutButton variant="floating" showLabel={false} />
        </GuidedTourProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}


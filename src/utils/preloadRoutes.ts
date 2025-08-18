"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PRELOAD_DELAY = 2000 // 2 seconds after page load

export function useRoutePreloader(routes: string[]) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      routes.forEach(route => {
        router.prefetch(route)
      })
    }, PRELOAD_DELAY)

    return () => clearTimeout(timer)
  }, [router, routes])
}

export function preloadCriticalRoutes() {
  if (typeof window === 'undefined') return

  // Preload critical routes that users often navigate to
  const criticalRoutes = [
    '/pay',
    '/login',
    '/register',
    '/book',
    '/customer/dashboard'
  ]

  // Use intersection observer to preload when user scrolls or shows intent
  const preloadOnIdle = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        criticalRoutes.forEach(route => {
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = route
          document.head.appendChild(link)
        })
      })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        criticalRoutes.forEach(route => {
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = route
          document.head.appendChild(link)
        })
      }, PRELOAD_DELAY)
    }
  }

  // Start preloading after initial page load
  if (document.readyState === 'complete') {
    preloadOnIdle()
  } else {
    window.addEventListener('load', preloadOnIdle)
  }
}

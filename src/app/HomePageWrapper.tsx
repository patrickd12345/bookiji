'use client'

import dynamic from 'next/dynamic'
import { isTruthyEnv } from '@/lib/env/isTruthyEnv'
import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

const HomePageModern2025 = dynamic(() => import('./HomePageModern2025'), { ssr: false })
const JarvisChat = dynamic(() => import('@/components/jarvis/JarvisChat'), { ssr: false })

export default function HomePageWrapper() {
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const { isAuthenticated, isAdmin, canOfferServices, canBookServices, loading } = useAuth()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    if (!loading && isAuthenticated && isMounted) {
      // Priority: Admin > Vendor > Customer
      if (isAdmin) {
        router.replace('/admin')
      } else if (canOfferServices) {
        router.replace('/vendor/dashboard')
      } else if (canBookServices) {
        router.replace('/customer/dashboard')
      }
    }
  }, [isAuthenticated, isAdmin, canOfferServices, canBookServices, loading, isMounted, router])

  const isE2E = isTruthyEnv(process.env.NEXT_PUBLIC_E2E) || isTruthyEnv(process.env.E2E)

  // Show loading state only while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <Suspense fallback={null}>
      {isMounted && isE2E && (
        <div className="px-6 pt-10 pb-4 text-center">
          <h1 className="text-4xl font-bold">Bookiji</h1>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                window.location.assign('/get-started')
              }}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold"
            >
              Get started
            </button>
          </div>
        </div>
      )}
      <HomePageModern2025 />
      <JarvisChat />
    </Suspense>
  )
}

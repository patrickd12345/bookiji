'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'

const NotifyForm = dynamic(() => import('@/components/NotifyForm'), { ssr: false })

export default function MaintenanceWrapper() {
  useEffect(() => {
    // Add noindex meta tag during maintenance
    const metaRobots = document.createElement('meta')
    metaRobots.name = 'robots'
    metaRobots.content = 'noindex, nofollow'
    document.head.appendChild(metaRobots)

    return () => {
      // Cleanup on unmount
      const existing = document.querySelector('meta[name="robots"]')
      if (existing && existing.getAttribute('content') === 'noindex, nofollow') {
        existing.remove()
      }
    }
  }, [])

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-8 gap-6">
      <div>
        <h1 className="text-4xl font-bold mb-4">🚧 Bookiji is almost ready!</h1>
        <p className="text-lg text-gray-600 max-w-xl">
          We&rsquo;re working hard behind the scenes to bring you the world&rsquo;s most flexible booking platform.<br />
          Join the beta and be the first to know when we launch!
        </p>
        <div className="mt-6">
          <NotifyForm />
        </div>
      </div>
    </main>
  )
}

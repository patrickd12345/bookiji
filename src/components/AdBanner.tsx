'use client'

import { useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function AdBanner() {
  const { roles, isAuthenticated } = useAuth()

  // Hide ads for premium users
  const isPremium = isAuthenticated && roles.includes('premium')
  const hasAdsenseConfig =
    !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID &&
    !!process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID

  useEffect(() => {
    if (isPremium) return
    if (!hasAdsenseConfig) {
      console.warn('AdSense configuration missing. Skipping ad load.')
      return
    }
    // Load the Google AdSense script once on mount
    const scriptId = 'adsbygoogle-js'
    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script')
      s.id = scriptId
      s.async = true
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
      s.setAttribute('data-ad-client', process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '')
      document.head.appendChild(s)
    }
    // Initialize adsbygoogle after script is loaded
    try {
      ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
      ;(window as any).adsbygoogle.push({})
    } catch (e) {
      console.error(e)
    }
  }, [isPremium, hasAdsenseConfig])

  if (isPremium || !hasAdsenseConfig) return null

  return (
    <div className="fixed bottom-0 left-0 w-full z-40">
      <div className="bg-background bg-opacity-90 border-t p-1 flex justify-center">
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
          data-ad-slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  )
}

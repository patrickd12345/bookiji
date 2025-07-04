'use client'

import { useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function AdBanner() {
  const { roles, isAuthenticated } = useAuth()

  // Hide ads for premium users
  const isPremium = isAuthenticated && roles.includes('premium')

  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  const adSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID
  const hasAdsenseConfig = !!adClient && !!adSlot

  useEffect(() => {
    if (isPremium || !hasAdsenseConfig) {
      if (!hasAdsenseConfig) {
        console.warn('AdSense client or slot ID is missing; ads will not be shown.')
      }
      return
    }

    const scriptId = 'adsbygoogle-js'

    const initAds = () => {
      try {
        ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
        ;(window as any).adsbygoogle.push({})
      } catch (e) {
        console.error('AdSense initialization failed', e)
      }
    }

    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script')
      s.id = scriptId
      s.async = true
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`
      s.crossOrigin = 'anonymous'
      s.onload = initAds
      document.head.appendChild(s)
    } else {
      initAds()
    }
  }, [isPremium, hasAdsenseConfig, adClient])


  if (isPremium || !hasAdsenseConfig) return null


  return (
    <div className="fixed bottom-0 left-0 w-full z-40">
      <div className="bg-background bg-opacity-90 border-t p-1 flex justify-center">
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  )
}

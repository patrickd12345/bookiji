'use client'

import { useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function AdBanner() {
  const { roles, isAuthenticated } = useAuth()

  // Hide ads for premium users
  const isPremium = isAuthenticated && roles.includes('premium')

  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  const adSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID

  useEffect(() => {
    if (isPremium) return
    if (!adClient || !adSlot) {
      console.warn('AdSense config missing: NEXT_PUBLIC_ADSENSE_CLIENT_ID or NEXT_PUBLIC_ADSENSE_SLOT_ID')

      return
    }
    // Load the Google AdSense script once on mount
    const scriptId = 'adsbygoogle-js'
    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script')
      s.id = scriptId
      s.async = true
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
      s.setAttribute('data-ad-client', adClient)
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


  if (isPremium || !adClient || !adSlot) return null


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

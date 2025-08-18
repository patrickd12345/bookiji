'use client'
import Script from 'next/script'
import { ADSENSE_GLOBAL_OFF } from '@/lib/adsense'

export default function AdSenseScript() {
	if (ADSENSE_GLOBAL_OFF) return null
	if (process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true') return null
	const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
	if (!client) return null

	return (
		<Script
			id="adsense-loader"
			async
			strategy="afterInteractive"
			crossOrigin="anonymous"
			src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
		/>
	)
}




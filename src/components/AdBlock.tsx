'use client'
import { useEffect } from 'react'

export default function AdBlock() {
	const approvalMode = process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true'
	const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
	const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT

	useEffect(() => {
		if (!approvalMode) return
		try {
			;(window.adsbygoogle = window.adsbygoogle || []).push({})
		} catch {}
	}, [approvalMode])

	if (!approvalMode || !client || !slot) return null

	return (
		<ins
			className="adsbygoogle"
			style={{ display: 'block', minHeight: 90 }}
			data-ad-client={client}
			data-ad-slot={slot}
			data-ad-format="auto"
			data-full-width-responsive="true"
		/>
	)
}



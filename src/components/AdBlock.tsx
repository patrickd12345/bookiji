'use client'
import { useEffect } from 'react'
import { ADSENSE_GLOBAL_OFF } from '@/lib/adsense'

export default function AdBlock() {
	const approvalMode = process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true'
	const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
	const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT

	useEffect(() => {
		if (!approvalMode || ADSENSE_GLOBAL_OFF) return
		try {
			;(window.adsbygoogle = window.adsbygoogle || []).push({})
		} catch {}
	}, [approvalMode])

	if (!approvalMode || !client || !slot) return null

	if (ADSENSE_GLOBAL_OFF) {
		return (
			<div
				style={{ display: 'block', minHeight: 280, width: '100%' }}
				data-testid="ads-placeholder"
			/>
		)
	}

	return (
		<ins
			className="adsbygoogle"
			style={{ display: 'block', minHeight: 280, width: '100%' }}
			data-ad-client={client}
			data-ad-slot={slot}
			data-ad-format="auto"
			data-full-width-responsive="true"
			data-testid="ads-slot"
		/>
	)
}



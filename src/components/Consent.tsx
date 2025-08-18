'use client'

type ConsentProps = {
	nonce?: string
}

export default function Consent({ nonce }: ConsentProps) {
	return (
		<script
			nonce={nonce}
			dangerouslySetInnerHTML={{
				__html: `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'consent.start': new Date().getTime()});})(window,document,'script','dataLayer');
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'default', { ad_user_data: 'denied', ad_personalization: 'denied', ad_storage: 'denied', analytics_storage: 'denied' });
      }
    `,
			}}
		/>
	)
}



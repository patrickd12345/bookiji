import NotifyForm from '@/components/NotifyForm'
import HomePageClient from './HomePageClient'
import Script from 'next/script'
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from '@/lib/seo/siteJsonLd'

import { ADSENSE_APPROVAL_MODE } from "@/lib/adsense"
// TEMPORARY: Show real site during AdSense approval mode (do not show maintenance page)
const isProduction = process.env.NODE_ENV === 'production'
export default function HomePage() {
  const host = process.env.CANONICAL_HOST ?? 'bookiji.com'
  const org = buildOrganizationJsonLd(host)
  const site = buildWebSiteJsonLd(host)
  // In production, show the temporary landing page unless AdSense approval mode is enabled
  if (isProduction && !ADSENSE_APPROVAL_MODE) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-8 gap-6">
        <Script id="site-jsonld" type="application/ld+json" data-testid="site-jsonld" dangerouslySetInnerHTML={{ __html: JSON.stringify([org, site]) }} />
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

  // In development or AdSense approval mode, show the real landing page
  return (
    <>
      <Script id="site-jsonld" type="application/ld+json" data-testid="site-jsonld" dangerouslySetInnerHTML={{ __html: JSON.stringify([org, site]) }} />
      <HomePageClient />
    </>
  )
} 

import dynamic from 'next/dynamic'
import { ADSENSE_APPROVAL_MODE } from "@/lib/adsense"

// Dynamically import client components to prevent server-side Supabase initialization
const NotifyForm = dynamic(() => import('@/components/NotifyForm'), { ssr: false })
const HomePageClient = dynamic(() => import('./HomePageClient'), { ssr: false })

/**
 * LAUNCH_MODE controls which page is shown:
 * - 'live': Show the real landing page (default for production)
 * - 'maintenance': Show the maintenance/coming soon page
 * - 'adsense': Show real site for AdSense approval (controlled by ADSENSE_APPROVAL_MODE)
 * 
 * Default: 'live' - production launches with real experience by default
 * Override with NEXT_PUBLIC_LAUNCH_MODE env variable
 */
const LAUNCH_MODE = process.env.NEXT_PUBLIC_LAUNCH_MODE || 'live'
const isMaintenanceMode = LAUNCH_MODE === 'maintenance' && process.env.NODE_ENV === 'production'
const isAdSenseMode = ADSENSE_APPROVAL_MODE || LAUNCH_MODE === 'adsense'

export default function HomePage() {
  // Show maintenance page only if explicitly set to maintenance mode in production
  if (isMaintenanceMode && !isAdSenseMode) {
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

  // Default: Show the real landing page (live mode)
  return <HomePageClient />
} 

import { ADSENSE_APPROVAL_MODE } from "@/lib/adsense"
import HomePageWrapper from './HomePageWrapper'
import MaintenanceWrapper from './MaintenanceWrapper'

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

export default function Page() {
  // Show maintenance page only if explicitly set to maintenance mode in production
  if (isMaintenanceMode && !isAdSenseMode) {
    return <MaintenanceWrapper />
  }

  // Default: Show the real landing page (live mode)
  return <HomePageWrapper />
} 

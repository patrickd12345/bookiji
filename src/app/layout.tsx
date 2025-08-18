import type { Metadata, Viewport } from 'next'
import './globals.css'
import '@/styles/a11y-theme.css'
import { GuidedTourProvider } from '@/components/guided-tours/GuidedTourProvider'
import MainNavigation from '@/components/MainNavigation'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import AdSenseScript from '@/components/AdSenseScript'
import Consent from '@/components/Consent'
import { OfflineBanner } from '@/components/OfflineBanner'
import { OfflineStatusProvider } from '@/components/providers/OfflineStatusProvider'

export const metadata: Metadata = {
  title: 'Bookiji — Universal Booking Platform',
          description: 'Book any service, anywhere, with confirmed bookings and $1 commitment fees.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans">
      <head>
        <meta name="color-scheme" content="light dark" />
        {/* <meta name="google-adsense-account" content="ca-pub-XXXX" /> */}
        {/* Consent Mode v2 default (EEA-friendly); precedes AdSense */}
        <Consent />
        <AdSenseScript />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <OfflineStatusProvider>
            <GuidedTourProvider>
              {/* Skip link for keyboard users */}
              <a href="#main" className="skip-link">Skip to main</a>
              <OfflineBanner />
              <MainNavigation />
              <main id="main" tabIndex={-1}>{children}</main>
            </GuidedTourProvider>
          </OfflineStatusProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
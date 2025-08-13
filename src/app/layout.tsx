import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import MainNavigation from '@/components/MainNavigation'
import Script from 'next/script'
import { ConsentManager } from '@/components/ConsentManager'
import { GuidedTourProvider } from '@/components/guided-tours/GuidedTourProvider'
import Link from 'next/link'
import '@/lib/observability/init'

// @ts-nocheck

// TEMPORARY: Disable console logging for AdSense approval
const ADSENSE_APPROVAL_MODE = true // Set to false after approval

// Suppress console logging during AdSense approval
if (ADSENSE_APPROVAL_MODE) {
  // Suppress server-side console logging
  if (typeof console !== 'undefined') {
    
    // Override console methods to suppress output
    console.log = () => {}
    console.error = () => {}
    console.warn = () => {}
    console.info = () => {}
    console.debug = () => {}
  }
  
  // Also suppress client-side console logging
  if (typeof window !== 'undefined') {
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    }
    
    // Override console methods to suppress output
    console.log = () => {}
    console.error = () => {}
    console.warn = () => {}
    console.info = () => {}
    console.debug = () => {}
    
    // Store original methods for potential restoration
    ;(window as { __originalConsole?: typeof originalConsole }).__originalConsole = originalConsole
  }
}

export const metadata: Metadata = {
  other: {
    'google-adsense-account': 'ca-pub-2311249346490347',
  },
  title: 'Bookiji - Universal Booking Platform',
  description: 'Book any service, anywhere, with guaranteed bookings and $1 commitment fees.',
  manifest: '/manifest.json',
  verification: {
    google: 'ca-pub-2311249346490347',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="font-sans" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-2311249346490347" />
        <meta name="google-site-verification" content="ca-pub-2311249346490347" />
        <meta name="google-adsense-account" content="ca-pub-2311249346490347" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
          strategy="afterInteractive"
          data-ad-client="ca-pub-2311249346490347"
          crossOrigin="anonymous"
        />
        <Script id="adsense-init" strategy="afterInteractive">
          {`
            if (!window.__adsbygoogle_page_level_ads_initialized) {
              window.adsbygoogle = window.adsbygoogle || [];
              window.adsbygoogle.push({
                google_ad_client: 'ca-pub-2311249346490347',
                enable_page_level_ads: true
              });
              window.__adsbygoogle_page_level_ads_initialized = true;
            }
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {/* Google AdSense loader script */}
        <GuidedTourProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="corporate"
            enableSystem
            disableTransitionOnChange
            themes={["corporate","light","dark","system","pastel","ocean","sunset","forest","cyberpunk","cupcake","midnight"]}
          >
            <div className="fixed top-4 right-4 z-50">
              <ThemeSwitcher />
            </div>
            <MainNavigation />
            <main className="min-h-screen pt-16">
              {children}
            </main>
          
          <footer className="bg-muted border-t border-border py-8 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-4 gap-8">
                <div>
                  <h3 className="font-semibold mb-3 text-foreground">Bookiji</h3>
                  <p className="text-sm text-muted-foreground">
                    Universal booking platform for all your service needs.
                  </p>
                </div>
                                  <div>
                  <h3 className="font-semibold mb-3 text-foreground">Learn More</h3>
                    <ul className="space-y-2 text-sm">
                      <li><Link href="/about" className="text-muted-foreground hover:text-foreground">About Us</Link></li>
                      <li><Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">How It Works</Link></li>
                      <li><Link href="/faq" className="text-muted-foreground hover:text-foreground">FAQ</Link></li>
                      <li><Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link></li>
                    </ul>
                  </div>
                <div>
                  <h3 className="font-semibold mb-3 text-foreground">Support</h3>
                  <ul className="space-y-2 text-sm">
                    <li><Link href="/help" className="text-muted-foreground hover:text-foreground">Help Center</Link></li>
                    <li><Link href="/help/tickets" className="text-muted-foreground hover:text-foreground">Contact Support</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 text-foreground">Legal</h3>
                  <ul className="space-y-2 text-sm">
                    <li><Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
                    <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
                    <li><Link href="/compliance" className="text-muted-foreground hover:text-foreground">AdSense Compliance</Link></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
                <p>© {new Date().getFullYear()} Bookiji. All rights reserved.</p>
              </div>
            </div>
          </footer>

        </ThemeProvider>
        </GuidedTourProvider>
        <ConsentManager />
      </body>
    </html>
  )
}

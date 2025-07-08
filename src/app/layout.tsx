import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import MainNavigation from '@/components/MainNavigation'
import Script from 'next/script'
import { ConsentManager } from '@/components/ConsentManager'

// @ts-nocheck

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  other: {
    'google-adsense-account': 'ca-pub-2311249346490347',
  },
  title: 'Bookiji - Universal Booking Platform',
  description: 'Book any service, anywhere, with guaranteed bookings and $1 commitment fees.',
  manifest: '/manifest.json',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-2311249346490347" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
          strategy="afterInteractive"
          data-ad-client="ca-pub-2311249346490347"
          crossOrigin="anonymous"
          data-nscript="afterInteractive"
        />
        <Script id="adsense-consent" strategy="afterInteractive">
          {`
            (function() {
              function getCookie(name) {
                const value = "; " + document.cookie;
                const parts = value.split("; " + name + "=");
                if (parts.length === 2) return parts.pop().split(";").shift();
              }
              
              // Check consent cookie
              const personalized = getCookie('personalized_ads');
              if (personalized === '0') {
                // User opted out of personalized ads
                window.adsbygoogle = window.adsbygoogle || [];
                window.adsbygoogle.push({
                  'google_ad_client': 'ca-pub-2311249346490347',
                  'enable_page_level_ads': true,
                  'tag_partner': 'bookiji',
                  'non_personalized_ads': 1
                });
              } else {
                // Default or user consented to personalized ads
                window.adsbygoogle = window.adsbygoogle || [];
                window.adsbygoogle.push({
                  'google_ad_client': 'ca-pub-2311249346490347',
                  'enable_page_level_ads': true,
                  'tag_partner': 'bookiji'
                });
              }
            })();
          `}
        </Script>
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        {/* Google AdSense loader script */}
        <ThemeProvider
          attribute="class"
          defaultTheme="corporate"
          enableSystem
          disableTransitionOnChange
          themes={["corporate", "light", "dark", "system", "pastel", "ocean", "sunset", "forest", "cyberpunk", "cupcake", "midnight"]}
        >
          <div className="fixed top-4 right-4 z-50">
            <ThemeSwitcher />
          </div>
          <MainNavigation />
          <main className="min-h-screen pt-16">
            {children}
          </main>
          
          <footer className="bg-gray-50 border-t py-8 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-4 gap-8">
                <div>
                  <h3 className="font-semibold mb-3">Bookiji</h3>
                  <p className="text-sm text-gray-600">
                    Universal booking platform for all your service needs.
                  </p>
                </div>
                                  <div>
                    <h3 className="font-semibold mb-3">Learn More</h3>
                    <ul className="space-y-2 text-sm">
                      <li><a href="/about" className="text-gray-600 hover:text-gray-900">About Us</a></li>
                      <li><a href="/how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</a></li>
                      <li><a href="/faq" className="text-gray-600 hover:text-gray-900">FAQ</a></li>
                      <li><a href="/blog" className="text-gray-600 hover:text-gray-900">Blog</a></li>
                    </ul>
                  </div>
                <div>
                  <h3 className="font-semibold mb-3">Support</h3>
                  <ul className="space-y-2 text-sm">
                    <li><a href="/help" className="text-gray-600 hover:text-gray-900">Help Center</a></li>
                    <li><a href="/help/tickets" className="text-gray-600 hover:text-gray-900">Contact Support</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Legal</h3>
                  <ul className="space-y-2 text-sm">
                    <li><a href="/terms" className="text-gray-600 hover:text-gray-900">Terms of Service</a></li>
                    <li><a href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy Policy</a></li>
                    <li><a href="/compliance" className="text-gray-600 hover:text-gray-900">AdSense Compliance</a></li>
                  </ul>
                </div>
              </div>
              <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
                <p>© {new Date().getFullYear()} Bookiji. All rights reserved.</p>
              </div>
            </div>
          </footer>
    
        </ThemeProvider>
        <ConsentManager />
      </body>
    </html>
  )
}
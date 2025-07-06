import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import MainNavigation from '@/components/MainNavigation'
import dynamic from 'next/dynamic'

// @ts-nocheck

const GoogleAdsense = dynamic(
  () => import('nextjs-google-adsense').then((mod) => mod.GoogleAdsense || mod.default),
  { ssr: false }
)

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
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
      {/* Head elements are managed via the metadata export above */}
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        {/* Google AdSense loader component */}
        <GoogleAdsense publisherId="ca-pub-2311249346490347" />
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
    
        </ThemeProvider>
      </body>
    </html>
  )
}
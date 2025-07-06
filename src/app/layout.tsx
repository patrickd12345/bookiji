import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Head from 'next/head'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import MainNavigation from '@/components/MainNavigation'

const adsenseClientId =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-2311249346490347'

// @ts-nocheck

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
      <Head>
        <meta name="google-adsense-account" content={adsenseClientId} />
      </Head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
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
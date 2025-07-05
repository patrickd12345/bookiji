import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import MainNavigation from '@/components/MainNavigation'
import AdBanner from '@/components/AdBanner'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
      <head>
        <meta name="color-scheme" content="light dark" />
        {/* Google AdSense loader injected without extra attributes */}
        {/* eslint-disable-next-line react/no-danger */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(){var s=document.createElement('script');s.async=true;s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-2311249346490347'}';s.crossOrigin='anonymous';document.head.appendChild(s);}();`,
          }}
        />
      </head>
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
          <AdBanner />
        </ThemeProvider>
      </body>
    </html>
  )
}
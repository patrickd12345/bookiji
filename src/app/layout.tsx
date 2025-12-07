import type { Metadata, Viewport } from 'next'
import './globals.css'
import RootLayoutWrapper from '@/components/RootLayoutWrapper'

export const metadata: Metadata = {
  title: 'Bookiji — Universal Booking Platform',
  description: 'Book any service, anywhere, with guaranteed bookings and $1 commitment fees.',
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
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <a href="#main" className="skip-link">Skip to main</a>
        <RootLayoutWrapper>
          <main id="main" tabIndex={-1}>{children}</main>
        </RootLayoutWrapper>
      </body>
    </html>
  )
}

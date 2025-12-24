import type { Metadata, Viewport } from 'next'
import './globals.css'
import RootLayoutWrapper from '@/components/RootLayoutWrapper'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: {
    default: 'Bookiji — Universal Booking Platform',
    template: '%s | Bookiji',
  },
  description: 'Book any service, anywhere, with guaranteed bookings and $1 commitment fees. AI-powered universal booking platform.',
  keywords: ['booking platform', 'service booking', 'appointment booking', 'online booking', 'service marketplace'],
  authors: [{ name: 'Bookiji' }],
  creator: 'Bookiji',
  publisher: 'Bookiji',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Bookiji',
    title: 'Bookiji — Universal Booking Platform',
    description: 'Book any service, anywhere, with guaranteed bookings and $1 commitment fees.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Bookiji - Universal Booking Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bookiji — Universal Booking Platform',
    description: 'Book any service, anywhere, with guaranteed bookings and $1 commitment fees.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="light dark" />
        <link rel="alternate" type="application/rss+xml" title="Bookiji Blog RSS Feed" href="/rss.xml" />
      </head>
      <body className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <a href="#main" className="skip-link">Skip to main</a>
        <RootLayoutWrapper>
          <main id="main" tabIndex={-1}>{children}</main>
        </RootLayoutWrapper>
        {process.env.NODE_ENV === 'production' && (
          <>
            <SpeedInsights />
            <Analytics />
          </>
        )}
      </body>
    </html>
  )
}

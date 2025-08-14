import type { Metadata, Viewport } from 'next'
import './globals.css'
import MainNavigation from '@/components/MainNavigation'
import { GuidedTourProvider } from '@/components/guided-tours/GuidedTourProvider'
import '@/lib/observability/init'

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
    <html lang="en" className="font-sans">
      <body className="min-h-screen bg-white text-gray-900">
        <GuidedTourProvider>
          <MainNavigation />
          <main>{children}</main>
        </GuidedTourProvider>
      </body>
    </html>
  )
}
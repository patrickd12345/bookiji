import type { Metadata, Viewport } from 'next'
import './globals.css'
import MainNavigation from '@/components/MainNavigation'
import { GuidedTourProvider } from '@/components/guided-tours/GuidedTourProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
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
    <html lang="en" suppressHydrationWarning className="font-sans">
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GuidedTourProvider>
            <MainNavigation />
            <div className="fixed top-4 right-4 z-50">
              <ThemeSwitcher />
            </div>
            <main>{children}</main>
          </GuidedTourProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
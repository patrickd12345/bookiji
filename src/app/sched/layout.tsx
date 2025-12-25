import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bookiji Scheduling - Reliable Booking System',
  description: 'A booking system that doesn\'t break under pressure—and proves it. Zero double bookings, safe reschedules, reliability certified.',
  openGraph: {
    title: 'Bookiji Scheduling',
    description: 'Reliable booking system with zero double bookings and certified reliability',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bookiji Scheduling',
    description: 'Reliable booking system that doesn\'t break under pressure',
  },
  alternates: {
    canonical: 'https://sched.bookiji.com',
  },
}

export default function SchedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}


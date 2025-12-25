/**
 * SEO metadata utilities for consistent canonical tags and OpenGraph/Twitter metadata
 */

import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com'
const siteName = 'Bookiji'

export interface PageMetadataOptions {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
}

/**
 * Generate complete metadata for a page with canonical, OpenGraph, and Twitter tags
 */
export function generatePageMetadata(options: PageMetadataOptions): Metadata {
  const { title, description, path, image, type = 'website', publishedTime, modifiedTime } = options
  const url = `${baseUrl}${path}`
  const imageUrl = image ? `${baseUrl}${image}` : `${baseUrl}/og-image.jpg`

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      siteName,
      title,
      description,
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

/**
 * Generate metadata for public marketing pages
 */
export const publicPageMetadata = {
  home: generatePageMetadata({
    title: 'Bookiji — Universal Booking Platform',
    description: 'Book any service, anywhere, with guaranteed bookings and $1 commitment fees. AI-powered universal booking platform.',
    path: '/',
  }),
  about: generatePageMetadata({
    title: 'About Us | Bookiji',
    description: 'Learn about Bookiji, the world\'s first universal booking platform connecting customers with service providers instantly.',
    path: '/about',
  }),
  howItWorks: generatePageMetadata({
    title: 'How It Works | Bookiji',
    description: 'Discover how Bookiji makes finding and booking services easier, safer, and more reliable than ever before.',
    path: '/how-it-works',
  }),
  faq: generatePageMetadata({
    title: 'Frequently Asked Questions | Bookiji',
    description: 'Find answers to common questions about Bookiji, our booking process, services, and how to get started.',
    path: '/faq',
  }),
  contact: generatePageMetadata({
    title: 'Contact Us | Bookiji',
    description: 'Get in touch with Bookiji support team. We\'re here to help with any questions or concerns.',
    path: '/contact',
  }),
}

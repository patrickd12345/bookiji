import type { Metadata } from 'next'
import Link from 'next/link'
import { canonicalUrl } from '@/lib/seo'
import { JsonLd } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Bookiji, the world\'s first universal booking platform connecting customers with service providers instantly.',
  alternates: {
    canonical: canonicalUrl('/about'),
  },
  openGraph: {
    title: 'About Bookiji',
    description: 'Learn about Bookiji, the world\'s first universal booking platform.',
    url: '/about',
  },
}

const aboutJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Bookiji',
  description: 'Universal booking platform connecting customers with service providers',
  url: canonicalUrl('/'),
  logo: canonicalUrl('/logo.png'),
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    url: canonicalUrl('/contact'),
  },
}

export default function AboutPage() {
  return (
    <>
      <JsonLd id="about-jsonld" json={aboutJsonLd} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">About Bookiji</h1>
      
      <div className="prose prose-lg max-w-none">
        <p className="text-lg text-gray-600 mb-8">
          Bookiji is the world&apos;s first universal booking platform that connects customers with service providers instantly.
        </p>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            Bookiji is revolutionizing the booking industry by creating a universal platform 
            where customers can book any service, anywhere, using external calendars as the source of availability.
            Our $1 commitment fee encourages serious bookings, and once a booking is confirmed we exchange contact information and exit.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">What Makes Us Different</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-medium mb-2">🤝 Commitment + Handoff</h3>
              <p className="text-gray-600">
                The $1 commitment fee reduces casual holds. After a booking is confirmed and contact information is exchanged, Bookiji exits.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2">🤖 AI-Powered Matching</h3>
              <p className="text-gray-600">
                Advanced AI helps match customers with the perfect service providers 
                based on location, availability, and preferences.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2">🗺️ Map Abstraction</h3>
              <p className="text-gray-600">
                Find services near you without revealing your exact location until 
                you&apos;re ready to book, protecting your privacy.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2">🌍 Universal Platform</h3>
              <p className="text-gray-600">
                One platform for all your booking needs - from home services to 
                professional consultations, beauty treatments to fitness classes.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
          <p className="text-gray-600 leading-relaxed">
            Founded with the vision of simplifying the booking process for everyone, 
            Bookiji emerged from the frustration of dealing with multiple booking 
            platforms, unreliable availability, and last-minute cancellations. We 
            believe that booking a service should be as easy as ordering food online.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">For Service Providers</h2>
          <p className="text-gray-600 leading-relaxed">
            Join thousands of service providers who trust Bookiji to connect them 
            with serious customers. Bookiji handles scheduling mechanics through booking confirmation and contact exchange, so you can coordinate service details directly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">For Customers</h2>
          <p className="text-gray-600 leading-relaxed">
            Experience fast booking with real-time availability sourced from connected calendars.
            The $1 commitment fee confirms intent; once your booking is confirmed, Bookiji exchanges contact information and exits.
            Payments for services are handled directly between you and the service provider.
          </p>
        </section>

        <section className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-6">
            Join the booking revolution today and experience the difference.
          </p>
          <div className="space-x-4">
            <Link
              href="/register"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign Up Now
            </Link>
            <Link
              href="/vendor/onboarding"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Become a Provider
            </Link>
          </div>
        </section>
      </div>
    </div>
    </>
  )
} 
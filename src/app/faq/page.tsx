import type { Metadata } from 'next'
import SmartFAQ from '@/components/SmartFAQ'
import Link from 'next/link'
import { canonicalUrl } from '@/lib/seo'
import { JsonLd } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Find answers to common questions about Bookiji, our booking process, services, and how to get started.',
  alternates: {
    canonical: canonicalUrl('/faq'),
  },
  openGraph: {
    title: 'FAQ - Bookiji',
    description: 'Frequently asked questions about Bookiji booking platform.',
    url: '/faq',
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does the $1 commitment fee work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The $1 commitment fee guarantees your booking spot and reduces no-shows. It\'s a small charge that ensures serious bookings and protects both customers and service providers.',
      },
    },
    {
      '@type': 'Question',
      name: 'What if my vendor cancels?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'If a vendor cancels, you\'ll get the provider\'s contact info after booking - you can arrange directly with them or get a refund.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is my privacy protected?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Both parties\' contact details are abstracted until booking is confirmed. We use map abstraction to protect provider locations.',
      },
    },
  ],
}

export default function FAQPage() {
  return (
    <>
      <JsonLd id="faq-jsonld" json={faqJsonLd} />
      <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-lg text-gray-600">
          Find answers to common questions about Bookiji, our booking process, and services.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <h3 className="font-semibold text-blue-800 mb-2">🤔 Getting Started</h3>
          <p className="text-sm text-blue-600">New to Bookiji? Learn the basics</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <h3 className="font-semibold text-green-800 mb-2">💰 Pricing & Fees</h3>
          <p className="text-sm text-green-600">Understand our $1 commitment system</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <h3 className="font-semibold text-purple-800 mb-2">🛡️ Safety & Security</h3>
          <p className="text-sm text-purple-600">Your privacy and security matters</p>
        </div>
      </div>

      {/* Dynamic FAQ Component */}
      <div className="mb-8">
        <SmartFAQ />
      </div>

      {/* Static Essential FAQs for SEO */}
      <div className="border-t pt-8">
        <h2 className="text-2xl font-semibold mb-6">Essential Information</h2>
        
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">What is Bookiji?</h3>
            <p className="text-gray-700 leading-relaxed">
              Bookiji is a universal booking platform that connects customers with service providers 
              across all industries. Whether you need a plumber, personal trainer, tutor, or any other 
              service, Bookiji makes it easy to find, book, and pay for services with guaranteed availability.
            </p>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">How does the $1 booking fee work?</h3>
            <p className="text-gray-700 leading-relaxed">
              A <strong>$1 booking fee</strong> is charged <strong>only when your booking is confirmed</strong>. This small fee helps reduce no‑shows and confirms your reservation. The fee is <strong>not refundable</strong>. The final payment for the actual service is handled directly between you and the service provider, outside of our platform.
            </p>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Is my personal information safe?</h3>
            <p className="text-gray-700 leading-relaxed">
              Yes! We use advanced map abstraction technology that lets you find services near you 
              without revealing your exact location until you&apos;re ready to book. Your privacy is 
              protected throughout the entire process, and we never share your personal information 
              without your consent.
            </p>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">How do I become a service provider?</h3>
            <p className="text-gray-700 leading-relaxed">
              Getting started as a service provider is easy! Simply sign up for a provider account, 
              complete your profile with your services and availability, connect your calendar for 
              automatic scheduling, and start receiving bookings. We handle payments, scheduling, 
              and customer communication.
            </p>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">What types of services are available?</h3>
            <p className="text-gray-700 leading-relaxed">
              Bookiji supports virtually any type of service - from home maintenance and personal care 
              to professional consultations and fitness training. Our AI-powered matching system helps 
              connect you with the right providers based on your specific needs, location, and preferences.
            </p>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Cancellations &amp; Changes</h3>
            <p className="text-gray-700 leading-relaxed">
              Bookiji does not provide in-app cancellations or rescheduling. To change or cancel, call the other party using the phone number shown on your confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-blue-50 p-6 rounded-lg mt-8 text-center">
        <h3 className="text-xl font-semibold mb-3">Still have questions?</h3>
        <p className="text-gray-600 mb-4">
          Can&apos;t find what you&apos;re looking for? Our support team is here to help!
        </p>
        <div className="space-x-4">
          <Link
            href="/help"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Contact Support
          </Link>
          <Link
            href="/help/tickets"
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Submit a Ticket
          </Link>
        </div>
      </div>
    </div>
    </>
  )
} 
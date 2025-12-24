import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MessageSquare, HelpCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact Us - Bookiji',
  description: 'Get in touch with Bookiji support team. We\'re here to help with any questions or concerns.',
}

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-lg text-gray-600">
          We&apos;re here to help! Get in touch with our support team.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Support Tickets */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Support Tickets</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Submit a support ticket for technical issues, account questions, or general inquiries.
          </p>
          <Link
            href="/help/tickets"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open Support Ticket
          </Link>
        </div>

        {/* Help Center */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Help Center</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Browse our comprehensive help articles and frequently asked questions.
          </p>
          <Link
            href="/help"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Visit Help Center
          </Link>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Other Ways to Reach Us</h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <Mail className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Email Support</h3>
              <p className="text-gray-600">
                For general inquiries, please use our{' '}
                <Link href="/help/tickets" className="text-blue-600 hover:underline">
                  support ticket system
                </Link>
                {' '}for faster response times.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Business Hours</h3>
            <p className="text-gray-600">
              Our support team is available Monday through Friday, 9:00 AM - 5:00 PM EST.
              We aim to respond to all inquiries within 24-48 hours.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Additional Resources</h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <Link href="/faq" className="text-blue-600 hover:underline">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}


import Link from 'next/link'

export default function HowItWorksPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">How Bookiji Works</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Discover how our revolutionary booking platform makes finding and booking services 
          easier, safer, and more reliable than ever before.
        </p>
      </div>

      {/* For Customers */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4 text-blue-600">For Customers</h2>
          <p className="text-lg text-gray-600">Book any service in 4 simple steps</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">🔍 Search & Discover</h3>
            <p className="text-gray-600">
              Use our AI-powered search to find services near you. Our map abstraction 
              technology protects your privacy while showing nearby providers.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-600">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">📅 Choose & Book</h3>
            <p className="text-gray-600">
              Browse available time slots and select a provider.
              Availability is sourced from connected calendars.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-600">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">💰 Secure Payment</h3>
            <p className="text-gray-600">
              Pay the $1 commitment fee to secure your booking. This ensures serious 
              bookings and enables contact handoff once confirmed.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-orange-600">4</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">✅ Enjoy Service</h3>
            <p className="text-gray-600">
              Meet your provider, receive your service, and pay the final amount directly to them. 
              Bookiji exits after booking confirmation and contact exchange.
            </p>
          </div>
        </div>
      </section>

      {/* For Providers */}
      <section className="mb-16 bg-gray-50 p-8 rounded-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4 text-green-600">For Service Providers</h2>
          <p className="text-lg text-gray-600">Start earning with commitment + handoff</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-600">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">📝 Sign Up</h3>
            <p className="text-gray-600">
              Create your provider profile, list your services, and set your rates. 
              Our verification process ensures quality and trust.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">🗓️ Set Availability</h3>
            <p className="text-gray-600">
              Connect your calendar or manually set your available time slots. 
              Our system syncs automatically to prevent double bookings.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-600">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">🔔 Receive Bookings</h3>
            <p className="text-gray-600">
              Get notified of new bookings instantly. The $1 commitment fee reduces casual holds.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-orange-600">4</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">💵 Get Paid</h3>
            <p className="text-gray-600">
              Provide your service and get paid directly by the customer. We only handle the $1 commitment fee - 
              the final service payment is between you and the customer.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">What Makes Bookiji Different</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-3">Commitment + Handoff</h3>
            <p className="text-gray-600">
              Our $1 commitment fee helps ensure bookings are intentional. Once confirmed, Bookiji exchanges contact information and exits.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-3">AI-Powered Matching</h3>
            <p className="text-gray-600">
              Our advanced AI analyzes your needs, location, and preferences to match 
              you with the perfect service providers every time.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold mb-3">Privacy Protection</h3>
            <p className="text-gray-600">
              Map abstraction technology lets you find nearby services without revealing 
              your exact location until you&apos;re ready to book.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-3">Real-Time Availability</h3>
            <p className="text-gray-600">
              See actual available time slots in real-time. No more calling around or 
              waiting for callbacks - book instantly with confidence.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-xl font-semibold mb-3">Secure Payments</h3>
            <p className="text-gray-600">
              We only process the $1 commitment fee securely. The final service payment is handled 
              directly between customers and providers, outside of our platform.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold mb-3">Scope Boundary</h3>
            <p className="text-gray-600">
              Bookiji guarantees booking mechanics through commitment + handoff. It does not provide post-booking judgments or dispute handling about service outcomes.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-lg">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-xl mb-6">
          Join thousands of satisfied customers and providers using Bookiji today!
        </p>
        <div className="space-x-4">
          <Link
            href="/register"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Book a Service
          </Link>
          <Link
            href="/vendor/onboarding"
            className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
          >
            Become a Provider
          </Link>
        </div>
      </section>
    </div>
  )
} 
import { useState } from 'react'

export function PlatformDisclosures() {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-8">
      <h2 className="text-xl font-bold mb-4">Important Information About Our Platform</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Booking Platform</h3>
          <p className="text-sm text-gray-600">
            Bookiji is a universal booking platform that connects users with service providers.
            We do not provide services directly - we facilitate bookings between users and independent providers.
          </p>
        </div>

        <div>
          <h3 className="font-medium">Commitment Fee</h3>
          <p className="text-sm text-gray-600">
            Our $1 commitment fee is a nominal charge to confirm your booking intention.
            This is not a service fee or deposit. The actual service cost is set by and paid directly to the provider.
          </p>
        </div>

        <div>
          <h3 className="font-medium">AI Features</h3>
          <p className="text-sm text-gray-600">
            Our AI assistant helps suggest bookings based on your preferences.
            While we strive for accuracy, AI suggestions are recommendations only and should be verified.
          </p>
        </div>

        <div>
          <h3 className="font-medium">Location Services</h3>
          <p className="text-sm text-gray-600">
            With your permission, we use location data to find nearby providers.
            You can disable location access at any time through your browser settings.
          </p>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:underline text-sm"
          suppressHydrationWarning
        >
          {showDetails ? 'Show Less' : 'Show More Details'}
        </button>

        {showDetails && (
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-medium">Service Providers</h3>
              <p className="text-sm text-gray-600">
                Service providers are independent businesses not employed by Bookiji.
                We verify basic information but recommend reviewing provider profiles and reviews.
              </p>
            </div>

            <div>
              <h3 className="font-medium">Payments</h3>
              <p className="text-sm text-gray-600">
                The $1 commitment fee is processed through our secure payment system.
                Service payments are handled directly between you and the provider.
              </p>
            </div>

            <div>
              <h3 className="font-medium">Cancellations &amp; Changes</h3>
              <p className="text-sm text-gray-600">
                Bookiji does not provide in-app cancellations or rescheduling. To change or cancel, call the other party using the phone number shown on your confirmation. $1 booking fee, charged only when your booking is confirmed. This fee is non-refundable and not applied to the service price.
              </p>
            </div>

            <div>
              <h3 className="font-medium">Data Usage</h3>
              <p className="text-sm text-gray-600">
                We collect and process data to provide our service.
                This includes booking history, preferences, and with consent, location data.
                See our Privacy Policy for full details.
              </p>
            </div>

            <div>
              <h3 className="font-medium">Third-Party Services</h3>
              <p className="text-sm text-gray-600">
                We use trusted services for payments (Stripe), data storage (Supabase),
                and advertising (Google AdSense). Each has their own privacy policies.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
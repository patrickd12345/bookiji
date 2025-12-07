import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy – Bookiji',
  description: 'Learn how Bookiji collects, uses and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-lg text-gray-600">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Who we are</h2>
          <p className="text-gray-700 leading-relaxed">
            Bookiji (&quot;we&quot;, &quot;us&quot;) is an online booking platform that helps vendors manage services, schedules and bookings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. What data we collect</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We collect:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li><strong>Account information</strong> – name, email address, password (hashed), workspace or business details.</li>
            <li><strong>Booking data</strong> – appointments, services, times, prices and related notes.</li>
            <li><strong>Usage data</strong> – pages visited, features used, performance and error logs.</li>
            <li><strong>Device and technical data</strong> – browser type, IP address (for security &amp; abuse prevention), approximate region.</li>
            <li><strong>Payment-related info</strong> – some payment metadata from our payment processor (e.g. Stripe), but not your full card number.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. How we use your data</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We use your data to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Provide and operate the Bookiji platform.</li>
            <li>Process bookings and payments.</li>
            <li>Keep the platform secure and reliable.</li>
            <li>Improve performance and user experience.</li>
            <li>Communicate with you about your account, security, important changes or new features.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Legal bases (if you are in the EU/EEA/UK)</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Where GDPR applies, we process your data based on:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Performance of a contract (providing the service you signed up for).</li>
            <li>Legitimate interests (improving and securing the platform).</li>
            <li>Your consent (for optional features like marketing emails, where applicable).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Cookies and similar technologies</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We may use cookies or similar technologies to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
            <li>Keep you logged in.</li>
            <li>Remember your preferences.</li>
            <li>Measure usage and performance.</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            You can usually control cookies in your browser settings, but some features may stop working if you disable them.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Third‑party services</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We rely on trusted third‑party providers, for example:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
            <li>Hosting / infrastructure (e.g. Vercel, cloud providers).</li>
            <li>Database and storage.</li>
            <li>Analytics and error monitoring.</li>
            <li>Payment processing (e.g. Stripe).</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            These providers only process your data to help us deliver the Bookiji service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Data retention</h2>
          <p className="text-gray-700 leading-relaxed">
            We keep your data for as long as you have an account or as needed to operate the service. We may retain some data for a longer period where required by law, to resolve disputes or enforce our agreements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Your rights</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Depending on your location, you may have the right to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate information.</li>
            <li>Request deletion of your data (where we are allowed to do so).</li>
            <li>Object to or restrict certain types of processing.</li>
            <li>Request a copy of your data in a portable format.</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            You can exercise these rights by contacting us using the details below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Security</h2>
          <p className="text-gray-700 leading-relaxed">
            We use reasonable technical and organizational measures to protect your data. However, no online service is 100% secure. You are responsible for keeping your account credentials safe.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. International transfers</h2>
          <p className="text-gray-700 leading-relaxed">
            Your data may be processed in countries outside your own, where data protection laws may differ. Where required, we implement safeguards to protect your data in line with applicable law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Changes to this policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time. If we make material changes, we will notify you (for example, via email or in‑app notice).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Contact us</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you have questions about this Privacy Policy or how we handle your data, you can contact us at:
          </p>
          <p className="text-gray-700 leading-relaxed">
            Email: 
          </p>
        </section>
      </div>
    </div>
  )
}

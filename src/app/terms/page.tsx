export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-lg text-gray-600">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            By accessing and using Bookiji (&quot;the Service&quot;), you accept and agree to be bound by the terms 
            and provision of this agreement. If you do not agree to abide by the above, please do not use 
            this service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p className="text-gray-700 leading-relaxed">
            Bookiji is a universal booking platform that connects customers with service providers across 
            various industries. We facilitate the booking process, handle payments, and provide tools for 
            scheduling and communication between parties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              <strong>Registration:</strong> You must create an account to use our services. You are 
              responsible for maintaining the confidentiality of your account credentials.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Accuracy:</strong> You agree to provide accurate, current, and complete information 
              during registration and to update such information as necessary.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Account Security:</strong> You are responsible for all activities that occur under 
              your account and for keeping your password secure.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Booking and Payment Terms</h2>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              <strong>Commitment Fee:</strong> A $1 commitment fee is charged for each booking to ensure 
              serious bookings and reduce no-shows. This fee is fully refunded upon completion of the 
              service appointment.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Service Payments:</strong> Bookiji does <strong>not</strong> process the final payment for services. We only facilitate a small commitment fee to secure bookings and help prevent no-shows. The remaining payment for services is handled directly between the customer and the service provider, outside of our platform.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Cancellation Policy:</strong> Cancellation policies vary by service provider. 
              Early cancellations typically receive full refunds, while last-minute cancellations may 
              be subject to provider-specific policies.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. User Responsibilities</h2>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              <strong>Customers:</strong> You agree to attend scheduled appointments, provide accurate 
              information, and treat service providers with respect.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Service Providers:</strong> You agree to provide services as described, maintain 
              professional standards, and honor confirmed bookings.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Prohibited Use:</strong> You may not use our service for illegal activities, 
              harassment, spam, or any purpose that violates these terms.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Privacy and Data Protection</h2>
          <p className="text-gray-700 leading-relaxed">
            Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect 
            your information. By using our service, you consent to the collection and use of information 
            in accordance with our Privacy Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
          <p className="text-gray-700 leading-relaxed">
            The service and its original content, features, and functionality are and will remain the 
            exclusive property of Bookiji and its licensors. The service is protected by copyright, 
            trademark, and other laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Disclaimer of Warranties</h2>
          <p className="text-gray-700 leading-relaxed">
            The information on this platform is provided on an &quot;as is&quot; basis. To the fullest extent 
            permitted by law, Bookiji disclaims all warranties, express or implied, including but not 
            limited to implied warranties of merchantability and fitness for a particular purpose.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
          <p className="text-gray-700 leading-relaxed">
            Bookiji shall not be liable for any indirect, incidental, special, consequential, or punitive 
            damages, including without limitation, loss of profits, data, use, goodwill, or other 
            intangible losses, resulting from your use of the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Dispute Resolution</h2>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              <strong>Customer Support:</strong> We encourage users to contact our support team first 
              to resolve any disputes or issues.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Mediation:</strong> For disputes between customers and service providers, we may 
              provide mediation services to help reach a fair resolution.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Governing Law:</strong> These terms shall be governed by and construed in accordance 
              with applicable laws.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Service Modifications</h2>
          <p className="text-gray-700 leading-relaxed">
            We reserve the right to modify or discontinue the service at any time without notice. We 
            shall not be liable to you or any third party for any modification, suspension, or 
            discontinuance of the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
          <p className="text-gray-700 leading-relaxed">
            We may terminate or suspend your account and bar access to the service immediately, without 
            prior notice or liability, under our sole discretion, for any reason whatsoever, including 
            but not limited to a breach of the terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            We reserve the right to update these terms at any time. We will notify users of any material 
            changes by posting the new terms on this page. Your continued use of the service after any 
            such changes constitutes your acceptance of the new terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
          <p className="text-gray-700 leading-relaxed">
            If you have any questions about these Terms of Service, please contact us through our 
            support system or help center.
          </p>
        </section>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg mt-8">
        <h3 className="text-xl font-semibold mb-3">Questions about our Terms?</h3>
        <p className="text-gray-600 mb-4">
          Our support team is here to help clarify any questions you may have about these terms.
        </p>
        <a 
          href="/help" 
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Contact Support
        </a>
      </div>
    </div>
  )
} 
export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-lg text-gray-600 mb-8">
          Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
        </p>
      </div>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="text-gray-700 leading-relaxed">
            Bookiji (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy 
            explains how we collect, use, disclose, and safeguard your information when you use our 
            universal booking platform and services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Personal Information</h3>
              <p className="text-gray-700 leading-relaxed">
                We collect information you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-700">
                <li>Name, email address, and phone number</li>
                <li>Account credentials and profile information</li>
                <li>Payment information (processed securely through third-party providers)</li>
                <li>Service preferences and booking history</li>
                <li>Communications with us and other users</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Location Information</h3>
              <p className="text-gray-700 leading-relaxed">
                We use advanced map abstraction technology to protect your exact location while still 
                enabling you to find nearby services. We collect approximate location data to match 
                you with relevant service providers, but your precise location is never shared without 
                your explicit consent.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Usage Information</h3>
              <p className="text-gray-700 leading-relaxed">
                We automatically collect information about how you use our platform, including:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-700">
                <li>Device information and IP address</li>
                <li>Browser type and operating system</li>
                <li>Pages visited and time spent on our platform</li>
                <li>Search queries and booking interactions</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Provide, maintain, and improve our booking services</li>
            <li>Process bookings and commitment fee payments securely</li>
            <li>Match customers with appropriate service providers</li>
            <li>Send booking confirmations and important updates</li>
            <li>Provide customer support and resolve disputes</li>
            <li>Prevent fraud and ensure platform security</li>
            <li>Analyze usage patterns to improve our services</li>
            <li>Comply with legal obligations and enforce our terms</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Service Providers</h3>
              <p className="text-gray-700 leading-relaxed">
                When you book a service, we share necessary information with the service provider to 
                facilitate your booking. This includes your name, contact information, and booking details.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Third-Party Service Providers</h3>
              <p className="text-gray-700 leading-relaxed">
                We may share information with trusted third-party service providers who help us operate 
                our platform, including payment processors, email services, and analytics providers. 
                These providers are bound by confidentiality agreements.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Legal Requirements</h3>
              <p className="text-gray-700 leading-relaxed">
                We may disclose your information if required by law, court order, or government request, 
                or to protect our rights, property, or safety, or that of our users.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
          <p className="text-gray-700 leading-relaxed">
            We implement appropriate technical and organizational measures to protect your personal 
            information against unauthorized access, alteration, disclosure, or destruction. This includes:
          </p>
          <ul className="list-disc pl-6 mt-2 text-gray-700 space-y-1">
            <li>Encryption of sensitive data in transit and at rest</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Secure commitment fee processing through PCI-compliant providers</li>
            <li>Employee training on data protection practices</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Access and Correction</h3>
              <p className="text-gray-700 leading-relaxed">
                You can access and update your personal information through your account settings. 
                You may also contact us to request corrections or updates to your information.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Data Portability</h3>
              <p className="text-gray-700 leading-relaxed">
                You have the right to request a copy of your personal information in a structured, 
                machine-readable format.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Deletion</h3>
              <p className="text-gray-700 leading-relaxed">
                You may request deletion of your personal information, subject to certain legal and 
                business requirements. Some information may be retained for legitimate business purposes 
                or legal compliance.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Communication Preferences</h3>
              <p className="text-gray-700 leading-relaxed">
                You can opt out of promotional communications at any time by following the unsubscribe 
                instructions in emails or updating your account preferences.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking Technologies</h2>
          <p className="text-gray-700 leading-relaxed">
            We use cookies and similar technologies to enhance your experience, remember your preferences, 
            and analyze how our platform is used. You can control cookie settings through your browser, 
            but some features may not function properly if cookies are disabled.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Children&apos;s Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            Our services are not intended for children under 13 years of age. We do not knowingly collect 
            personal information from children under 13. If we become aware that a child under 13 has 
            provided us with personal information, we will delete such information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
          <p className="text-gray-700 leading-relaxed">
            Your information may be transferred to and processed in countries other than your own. 
            We ensure appropriate safeguards are in place to protect your information in accordance 
            with applicable data protection laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Data Retention</h2>
          <p className="text-gray-700 leading-relaxed">
            We retain your personal information for as long as necessary to provide our services, 
            comply with legal obligations, resolve disputes, and enforce our agreements. When information 
            is no longer needed, we securely delete or anonymize it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Changes to This Privacy Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any material 
            changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. 
            Your continued use of our services after any changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed">
            If you have any questions about this Privacy Policy or our data practices, please contact 
            us through our support system or help center. We are committed to addressing your concerns 
            and protecting your privacy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. AdSense Compliance</h2>
          <p className="text-gray-700 leading-relaxed">
            We maintain full compliance with Google AdSense policies. For detailed information about 
            our compliance measures, please see our 
            <a href="/compliance" className="text-blue-600 hover:text-blue-800 underline">AdSense Compliance Audit</a>.
          </p>
        </section>
      </div>

      <div className="bg-green-50 p-6 rounded-lg mt-8">
        <h3 className="text-xl font-semibold mb-3">🔒 Your Privacy Matters</h3>
        <p className="text-gray-600 mb-4">
          We&apos;re committed to ensuring your privacy and security at every step. 
          If you have any questions or concerns, we&apos;re here to help.
        </p>
        <a 
          href="/help" 
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Contact Privacy Team
        </a>
      </div>
    </div>
  )
} 
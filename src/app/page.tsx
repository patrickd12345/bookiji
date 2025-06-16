import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 bg-white shadow">
        <div className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="Bookiji Logo" width={32} height={32} />
          <span className="font-bold text-xl text-blue-700">Bookiji</span>
        </div>
        <nav className="flex gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Get Started</button>
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Become a Provider</button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center flex-1 py-12">
        <h1 className="text-4xl font-extrabold mb-2 text-center">Book any service, anywhere. Guaranteed.</h1>
        <p className="text-lg text-gray-700 mb-6 text-center">The world's first AI-powered, commitment-based booking platform.</p>
        <button className="px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition mb-8">Join the Beta</button>

        {/* How It Works */}
        <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">How It Works</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-800">
            <li>Tell Bookiji what you need (chat, voice, or search)</li>
            <li>See instant, privacy-protected options</li>
            <li>Book with $1, get instant confirmation</li>
            <li>Show up, earn rewards, build your reliability</li>
          </ol>
        </div>

        {/* What Makes Bookiji Different */}
        <div className="w-full max-w-2xl bg-blue-50 rounded-xl shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">What Makes Bookiji Different</h2>
          <ul className="list-disc list-inside space-y-2 text-blue-900">
            <li><b>$1 Commitment Fee</b> (no more no-shows)</li>
            <li><b>AI Conversational Booking</b></li>
            <li><b>Vendor Privacy</b> (map abstraction)</li>
            <li><b>Mutual Reliability</b> (user & provider scores)</li>
          </ul>
        </div>

        {/* Beta Announcement */}
        <div className="w-full max-w-2xl bg-yellow-50 rounded-xl shadow p-4 mb-6 text-center">
          <span className="font-semibold text-yellow-800">Bookiji is now in global beta! Reduced fees, founding user perks, and your feedback shapes the future.</span>
        </div>

        {/* Testimonials & FAQ (placeholders) */}
        <div className="w-full max-w-2xl flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-1 bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-2">Testimonials</h3>
            <p className="italic text-gray-600">"Bookiji made booking so easy and reliable!"</p>
            <p className="italic text-gray-600">"No more no-shows. I love the $1 guarantee."</p>
          </div>
          <div className="flex-1 bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-2">FAQ</h3>
            <p className="mb-1"><b>How does the $1 fee work?</b> It guarantees your spot and reduces no-shows.</p>
            <p className="mb-1"><b>What if my provider cancels?</b> You get rematched or compensated automatically.</p>
            <p className="mb-1"><b>How is my privacy protected?</b> Provider locations are abstracted until booking is confirmed.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-100 py-4 text-center text-gray-600 border-t">
        About | Contact | Provider Onboarding | Beta Feedback | Legal
      </footer>
    </div>
  );
} 
'use client'

import Image from 'next/image'
import { useState } from 'react'
import AIConversationalInterface from '../components/AIConversationalInterface'
import FeatureSummary from '../components/FeatureSummary'
import { AIResponse } from '../types'

export default function Home() {
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([])
  const [isAiActive, setIsAiActive] = useState(false)

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

      {/* Hero Section with AI Interface */}
      <section className="flex flex-col items-center justify-center flex-1 py-12">
        <h1 className="text-4xl font-extrabold mb-2 text-center">Book any service, anywhere. Guaranteed.</h1>
        <p className="text-lg text-gray-700 mb-6 text-center">The world's first AI-powered, commitment-based booking platform.</p>
        
        {/* AI Conversational Interface - Main Feature */}
        <div className="w-full max-w-2xl mb-8">
          <AIConversationalInterface 
            aiResponses={aiResponses}
            setAiResponses={setAiResponses}
            isAiActive={isAiActive}
            setIsAiActive={setIsAiActive}
          />
        </div>

        {/* Feature Summary */}
        <div className="w-full max-w-2xl mb-8">
          <FeatureSummary />
        </div>

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

        {/* Platform Features Showcase */}
        <div className="w-full max-w-4xl mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Platform Features</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer Personas */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-3">🎭 Customer Personas</h3>
              <p className="text-gray-600 mb-3">Personalized experience based on your preferences and booking history.</p>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">Professional</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Wellness</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">Creative</span>
              </div>
            </div>

            {/* Map Abstraction */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-3">🗺️ Map Abstraction</h3>
              <p className="text-gray-600 mb-3">Vendor privacy protection with abstracted availability zones.</p>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm">Dense Area</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">Medium Area</span>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">Sparse Area</span>
              </div>
            </div>

            {/* Booking Guarantee */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-3">🔒 Booking Guarantee</h3>
              <p className="text-gray-600 mb-3">$1 commitment fee ensures reliable bookings and reduces no-shows.</p>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Instant Confirmation</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">Provider Details</span>
              </div>
            </div>

            {/* No-Show System */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-3">⭐ Reliability System</h3>
              <p className="text-gray-600 mb-3">Post-appointment feedback and reliability scoring for both parties.</p>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">Star Ratings</span>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">No-Show Tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Beta Announcement */}
        <div className="w-full max-w-2xl bg-yellow-50 rounded-xl shadow p-4 mb-6 text-center">
          <span className="font-semibold text-yellow-800">Bookiji is now in global beta! Reduced fees, founding user perks, and your feedback shapes the future.</span>
        </div>

        {/* Testimonials & FAQ */}
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
  )
} 
'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/useI18n'
import { 
  LocaleSelector, 
  RealTimeBookingChat, 
  BigActionButton, 
  AIRadiusScaling,
  GuidedTourManager,
  SimpleTourButton
} from '@/components'

export default function HomePage() {
  const { t, formatCurrency, locale } = useI18n()
  const [showTour, setShowTour] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Language Selector */}
      <div className="absolute top-4 right-4">
        <LocaleSelector variant="icon-only" />
      </div>
      
      {/* Guided Tour Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <SimpleTourButton onClick={() => setShowTour(true)} />
      </div>
      
      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            🌍 Global Beta Launch - Available in 37 countries
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Universal Booking Platform
          </h1>
          
          <p className="text-xl md:text-2xl text-base-content/70 mb-8 max-w-3xl mx-auto">
            Book any service, anywhere, instantly. One-click booking with AI assistance and {formatCurrency(100)} commitment fee guarantee.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a 
              href="/get-started" 
              className="btn btn-primary btn-lg text-lg"
            >
              🚀 Start Booking
            </a>
            <a 
              href="/vendor/onboarding" 
              className="btn btn-outline btn-primary btn-lg text-lg"
            >
              List Your Business
            </a>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="feature-grid" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-base-content">
            Experience the Future of Booking
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Real-Time Booking Chat */}
            <div id="booking-chat-section" className="card bg-base-200 shadow-xl border border-base-300">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-success to-primary rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">💬</span>
                  </div>
                  <h3 className="card-title text-base-content">Real-Time Booking Chat</h3>
                </div>
                <p className="text-base-content/70 mb-4">
                  AI-powered chat interface that extracts booking intent and creates real-time bookings with instant payment processing.
                </p>
                <BigActionButton onStartTour={() => setShowTour(true)} />
                <RealTimeBookingChat />
              </div>
            </div>

            {/* AI Radius Scaling */}
            <div className="card bg-base-200 shadow-xl border border-base-300">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-secondary to-accent rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">🗺️</span>
                  </div>
                  <h3 className="card-title text-base-content">AI Radius Scaling</h3>
                </div>
                <p className="text-base-content/70 mb-4">
                  Intelligent location-based search that adapts to service density and user preferences for optimal provider matching.
                </p>
                <AIRadiusScaling 
                  service="general"
                  location="Current Location"
                  onRadiusChangeAction={(radius: number) => console.log('Radius changed:', radius)}
                />
              </div>
            </div>
          </div>

          {/* Core Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-base-content">{formatCurrency(100)} Commitment</h3>
              <p className="text-base-content/70">Revolutionary micro-deposit system ensures serious bookings</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-base-content">AI Booking Assistant</h3>
              <p className="text-base-content/70">Conversational AI handles complex booking requirements</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗺️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-base-content">Map Abstraction</h3>
              <p className="text-base-content/70">Privacy-first location system with smart radius zones</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-base-content">Booking Guarantees</h3>
              <p className="text-base-content/70">Self-enforcing contracts with automatic dispute resolution</p>
            </div>
          </div>
        </div>
      </section>

      {/* Global Launch Stats */}
      <section className="py-16 px-4 bg-base-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8 text-base-content">Global Scale, Local Feel</h2>
          
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">37</div>
              <div className="text-base-content/70">Countries Supported</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-secondary mb-2">27</div>
              <div className="text-base-content/70">Currencies Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-success mb-2">17</div>
              <div className="text-base-content/70">Languages & Locales</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-base-content">
            Ready to Transform Booking?
          </h2>
          <p className="text-xl text-base-content/70 mb-8">
            Join thousands of businesses already using Bookiji to streamline their booking process.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/get-started" 
              className="btn btn-primary btn-lg text-lg"
            >
              Start Booking Now
            </a>
            <a 
              href="/vendor/onboarding" 
              className="btn btn-outline btn-primary btn-lg text-lg"
            >
              List Your Business
            </a>
          </div>
        </div>
      </section>

      {/* Guided Tour Manager */}
      {showTour && (
        <GuidedTourManager 
          type="customer"
          onComplete={() => setShowTour(false)}
          onSkip={() => setShowTour(false)}
        />
      )}
    </div>
  )
} 

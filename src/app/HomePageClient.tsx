'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/useI18n'
import { useAuth } from '../../hooks/useAuth'
import { 
  LocaleSelector, 
  RealTimeBookingChat, 
  BigActionButton, 
  AIRadiusScaling,
  GuidedTourManager,
  SimpleTourButton,
  PlatformDisclosures
} from '@/components'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { PlayCircle, Briefcase } from 'lucide-react'
import Link from 'next/link'

interface HomePageClientProps {
  initialLocale: string
}

export default function HomePageClient({ initialLocale }: HomePageClientProps) {
  const { t, formatCurrency, setLocale } = useI18n()
  const { 
    isAuthenticated, 
    canBookServices, 
    canOfferServices, 
    loading 
  } = useAuth()
  const [showTour, setShowTour] = useState(false)

  // Sync initial server locale on mount
  useEffect(() => {
    if (initialLocale) {
      setLocale(initialLocale)
    }
  }, [initialLocale, setLocale])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Language Selector */}
      <div className="absolute top-4 left-4">
        <LocaleSelector variant="icon-only" />
      </div>
      
      {/* Guided Tour Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <SimpleTourButton onClick={() => setShowTour(true)} />
      </div>
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center" data-tour="hero-section">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Book Anything,{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Anywhere
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The universal booking platform powered by AI. Find and book local services instantly.
            </p>
            
            {/* Search Section */}
            <div className="max-w-2xl mx-auto mb-8" data-tour="search-section">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="What service do you need?"
                  className="flex-1 px-6 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
                  Search
                </button>
              </div>
            </div>

            {/* AI Chat Section */}
            <div className="mb-8" data-tour="ai-chat">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-lg border">
                <span className="text-2xl">🤖</span>
                <span className="text-gray-700 font-medium">Try our AI booking assistant</span>
                <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 transition-colors">
                  Start Chat
                </button>
              </div>
            </div>

            {/* Commitment Fee Explanation */}
            <div className="mb-8" data-tour="commitment-fee">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm">
                <span>💡</span>
                <span>Only $1 commitment fee • No hidden charges</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center" data-tour="get-started-btn">
              <Link
                href="/get-started"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-lg"
              >
                Get Started
              </Link>
              <button className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition-all duration-200 text-lg">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Discover Local Providers
            </h2>
            <p className="text-xl text-gray-600">
              Find trusted service providers in your area with real-time availability
            </p>
          </div>
          
          {/* Map Container */}
          <div className="relative" data-tour="map-container">
            <div className="bg-gray-200 rounded-lg h-96 flex items-center justify-center" data-tour="map-controls">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-gray-600">Interactive Map Coming Soon</p>
                <p className="text-sm text-gray-500">Real-time provider discovery with availability</p>
              </div>
            </div>
            
            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2" data-tour="map-controls">
              <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50">
                ➕
              </button>
              <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50">
                ➖
              </button>
            </div>
            
            {/* Provider Markers Placeholder */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" data-tour="provider-markers">
              <div className="flex gap-4">
                <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg" title="Available Provider"></div>
                <div className="w-4 h-4 bg-orange-500 rounded-full shadow-lg" title="Limited Availability"></div>
              </div>
            </div>
          </div>
          
          {/* Filter Panel */}
          <div className="mt-8 flex flex-wrap gap-4 justify-center" data-tour="filter-panel">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm">All Services</button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300">Health & Medical</button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300">Beauty & Wellness</button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300">Hair & Styling</button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300">Automotive</button>
          </div>
          
          {/* View Toggle */}
          <div className="mt-6 text-center" data-tour="list-view-toggle">
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">
              Switch to List View
            </button>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <section id="feature-grid" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            Experience the Future of Booking
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Real-Time Booking Chat */}
            <Card className="shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">💬</span>
                  </div>
                  <CardTitle className="text-foreground">Real-Time Booking Chat</CardTitle>
                </div>
                <p className="text-muted-foreground mb-4">
                  AI-powered chat interface that extracts booking intent and creates real-time bookings with instant payment processing.
                </p>
                <BigActionButton onStartTour={() => setShowTour(true)} />
                <RealTimeBookingChat />
              </CardContent>
            </Card>

            {/* AI Radius Scaling */}
            <Card className="shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">🗺️</span>
                  </div>
                  <CardTitle className="text-foreground">AI Radius Scaling</CardTitle>
                </div>
                <p className="text-muted-foreground mb-4">
                  Intelligent location-based search that adapts to service density and user preferences for optimal provider matching.
                </p>
                <AIRadiusScaling 
                  service="general"
                  location="Current Location"
                  onRadiusChangeAction={(radius: number) => console.log('Radius changed:', radius)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Core Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">{formatCurrency(100)} only Commitment</h3>
              <p className="text-muted-foreground">Revolutionary micro-deposit system ensures serious bookings</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">AI Booking Assistant</h3>
              <p className="text-muted-foreground">Conversational AI handles complex booking requirements</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗺️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Map Abstraction</h3>
              <p className="text-muted-foreground">Privacy-first location system with smart radius zones</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Booking Guarantees</h3>
              <p className="text-muted-foreground">Self-enforcing contracts with automatic dispute resolution</p>
            </div>
          </div>
        </div>
      </section>

      {/* Global Launch Stats */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8 text-foreground">{t('home.launch_stats.title')}</h2>
          
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">37</div>
              <div className="text-muted-foreground">{t('home.launch_stats.countries')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-secondary mb-2">27</div>
              <div className="text-muted-foreground">{t('home.launch_stats.currencies')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-500 mb-2">17</div>
              <div className="text-muted-foreground">{t('home.launch_stats.languages')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
            {t('home.cta.title')}
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            {t('home.cta.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {loading ? (
              // Loading state
              <>
                <div className="h-10 w-40 bg-muted animate-pulse rounded-md"></div>
                <div className="h-10 w-40 bg-muted animate-pulse rounded-md"></div>
              </>
            ) : !isAuthenticated ? (
              // Not logged in - show onboarding CTAs
              <>
                <a href="/get-started">
                  <Button className="h-10 px-8 text-lg flex items-center gap-2">
                    <PlayCircle className="w-4 h-4" />
                    {t('cta.start_booking_now')}
                  </Button>
                </a>
                <a href="/vendor/onboarding">
                  <Button variant="outline" className="h-10 px-8 text-lg flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {t('cta.list_business')}
                  </Button>
                </a>
              </>
            ) : (
              // Logged in - show dashboard CTAs based on capabilities
              <>
                {canBookServices && (
                  <a href="/dashboard">
                    <Button className="h-10 px-8 text-lg">
                      {t('cta.open_customer_dashboard')}
                    </Button>
                  </a>
                )}
                {canOfferServices && (
                  <a href="/vendor/dashboard">
                    <Button variant="outline" className="h-10 px-8 text-lg">
                      {t('cta.open_vendor_dashboard')}
                    </Button>
                  </a>
                )}
                {/* Fallback CTAs if user lacks capabilities */}
                {!canBookServices && !canOfferServices && (
                  <a href="/get-started">
                    <Button className="h-10 px-8 text-lg flex items-center gap-2">
                      <PlayCircle className="w-4 h-4" />
                      {t('cta.get_started')}
                    </Button>
                  </a>
                )}
              </>
            )}
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
      <PlatformDisclosures />
    </div>
  )
} 

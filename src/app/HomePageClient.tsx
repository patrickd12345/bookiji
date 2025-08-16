'use client'

import { useState, useEffect, useMemo } from 'react'
import { useI18n } from '@/lib/i18n/useI18n'
import { useAuth } from '../../hooks/useAuth'
import { 
  LocaleSelector, 
  RealTimeBookingChat, 
  BigActionButton, 
  AIRadiusScaling,
  GuidedTourManager,
  SimpleTourButton,
  PlatformDisclosures,
  RealAIChat
} from '@/components'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'

import Link from 'next/link'

// Wrapper component to handle browser extension attributes without breaking functionality
function HydrationSafeButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} suppressHydrationWarning>
      {children}
    </button>
  )
}

function HydrationSafeInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} suppressHydrationWarning />
  )
}

interface HomePageClientProps {
  initialLocale: string
}

export default function HomePageClient({ initialLocale }: HomePageClientProps) {
  const { t, formatCurrency, setLocale, locale } = useI18n()
  const { 
    isAuthenticated, 
    canBookServices, 
    canOfferServices, 
    loading 
  } = useAuth()
  const [showTour, setShowTour] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDemo, setShowDemo] = useState(false)

  // Sync initial server locale on mount
  useEffect(() => {
    if (initialLocale) {
      setLocale(initialLocale)
    }
  }, [initialLocale, setLocale])

  // Handle search functionality
  const handleSearch = () => {
    if (searchQuery.trim()) {
      // For now, redirect to search results or open AI chat with the query
      setShowAIChat(true)
      // You can implement actual search functionality here
      console.log('Searching for:', searchQuery)
    }
  }

  // Handle demo functionality
  const handleDemo = () => {
    setShowDemo(true)
    // You can implement actual demo functionality here
    console.log('Opening demo')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted/30" suppressHydrationWarning>
      {/* Language Selector */}
      <div className="absolute top-4 left-4">
        <LocaleSelector variant="icon-only" />
        
        {process.env.NODE_ENV === 'development' && (
          <>
            {/* Debug: Show current locale and test button */}
            <div className="mt-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
              Current: {locale}
            </div>
            <button 
              onClick={() => setLocale('fr-FR')} 
              className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded"
              suppressHydrationWarning
            >
              Test French
            </button>
            {/* Debug: Show translated welcome message */}
            <div className="mt-2 text-sm bg-green-50 px-2 py-1 rounded border border-green-200">
              Welcome: {t('welcome')}
            </div>
            {/* Database Diagnostics Link */}
            <Link 
              href="/simple-test" 
              className="mt-2 text-xs bg-amber-500 text-white px-2 py-1 rounded block text-center hover:bg-amber-600 transition-colors"
            >
              🔍 Database Diagnostics
            </Link>
          </>
        )}
      </div>
      
      {/* Guided Tour Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <SimpleTourButton onClick={() => setShowTour(true)} />
      </div>
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center" data-tour="hero-section">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              {t('home.headline')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              {t('home.tagline', { fee: formatCurrency(1) })}
            </p>
            
            {/* Search Section */}
            <div className="max-w-2xl mx-auto mb-8" data-tour="search-section">
              <div className="flex flex-col sm:flex-row gap-4">
                <HydrationSafeInput 
                  type="text"
                  placeholder={t('home.search_placeholder')}
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-6 py-4 text-lg border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                />
                <HydrationSafeButton 
                  onClick={handleSearch}
                  disabled={!searchQuery.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('buttons.search')}
                </HydrationSafeButton>
              </div>
            </div>

            {/* AI Chat Section */}
            <div className="mb-8" data-tour="ai-chat">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-card rounded-full shadow-lg border border-border">
                <span className="text-2xl">🤖</span>
                <span className="text-card-foreground font-medium">{t('home.feature_grid.chat.title')}</span>
                <HydrationSafeButton 
                  onClick={() => setShowAIChat(true)}
                  className="ml-4 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm hover:opacity-90 transition-colors"
                >
                  {t('buttons.start_chat')}
                </HydrationSafeButton>
              </div>
            </div>

            {/* Commitment Fee Explanation */}
            <div className="mb-8" data-tour="commitment-fee">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-full text-sm">
                <span>💡</span>
                <span>{t('home.commitment_banner', { fee: formatCurrency(1) })}</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center" data-tour="get-started-btn">
              <Link
                href="/get-started"
                className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-all duration-200 text-lg"
              >
                {t('cta.get_started')}
              </Link>
              <HydrationSafeButton 
                onClick={handleDemo}
                className="px-8 py-4 border-2 border-border text-foreground font-semibold rounded-lg hover:border-muted-foreground transition-all duration-200 text-lg hover:bg-muted/50"
              >
                {t('buttons.watch_demo')}
              </HydrationSafeButton>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <section id="feature-grid" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            {t('home.feature_grid.title')}
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Real-Time Booking Chat */}
            <Card className="shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground text-sm">💬</span>
                  </div>
                  <CardTitle className="text-foreground">{t('home.feature_grid.chat.title')}</CardTitle>
                </div>
                <p className="text-muted-foreground mb-4">
                  {t('home.feature_grid.chat.desc')}
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
                    <span className="text-primary-foreground text-sm">🗺️</span>
                  </div>
                  <CardTitle className="text-foreground">{t('home.feature_grid.radius.title')}</CardTitle>
                </div>
                <p className="text-muted-foreground mb-4">
                  {t('home.feature_grid.radius.desc')}
                </p>
                <AIRadiusScaling 
                  service="general"
                  location="Current Location"
                  onRadiusChangeAction={useMemo(() => {
                    let timeout: ReturnType<typeof setTimeout> | null = null
                    let lastValue: number | null = null
                    return (radius: number) => {
                      if (lastValue === radius) return
                      lastValue = radius
                      if (timeout) clearTimeout(timeout)
                      timeout = setTimeout(() => {
                        console.log('Radius changed:', radius)
                        timeout = null
                      }, 150)
                    }
                  }, [])}
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
              <h3 className="text-xl font-semibold mb-2 text-foreground">{t('home.core.commitment.title', { fee: formatCurrency(1) })}</h3>
              <p className="text-muted-foreground">{t('home.core.commitment.desc')}</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">{t('home.core.assistant.title')}</h3>
              <p className="text-muted-foreground">{t('home.core.assistant.desc')}</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗺️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">{t('home.core.map.title')}</h3>
              <p className="text-muted-foreground">{t('home.core.map.desc')}</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">{t('home.core.guarantees.title')}</h3>
              <p className="text-muted-foreground">{t('home.core.guarantees.desc')}</p>
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
                <Button
                  className="h-14 px-10 text-xl flex flex-col items-start gap-1 rounded-lg shadow-lg"
                  onClick={() => {
                    window.location.href = '/register?redirect=/customer/dashboard';
                  }}
                  aria-label="Book an appointment as a customer"
                  suppressHydrationWarning
                >
                  <span>{t('buttons.book_appointment')}</span>
                  <span className="text-sm text-gray-200">(Customer)</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-14 px-10 text-xl flex flex-col items-start gap-1 rounded-lg shadow-lg"
                  onClick={() => {
                    window.location.href = '/register?redirect=/vendor/dashboard';
                  }}
                  aria-label="Offer your services as a provider"
                  suppressHydrationWarning
                >
                  <span>{t('buttons.offer_services')}</span>
                  <span className="text-sm text-gray-500">(Provider)</span>
                </Button>
              </>
            ) : (
              // Logged in - show dashboard CTAs based on capabilities
              <>
                {canBookServices && (
                  <Link href="/customer/dashboard">
                    <Button className="h-10 px-8 text-lg flex flex-col items-start gap-1" suppressHydrationWarning>
                      <span>{t('buttons.book_appointment')}</span>
                      <span className="text-xs text-gray-500">(Customer)</span>
                    </Button>
                  </Link>
                )}
                {canOfferServices && (
                  <Link href="/vendor/dashboard">
                    <Button variant="outline" className="h-10 px-8 text-lg flex flex-col items-start gap-1" suppressHydrationWarning>
                      <span>{t('buttons.offer_services')}</span>
                      <span className="text-xs text-gray-500">(Provider)</span>
                    </Button>
                  </Link>
                )}
                {/* Fallback CTAs if user lacks capabilities */}
                {!canBookServices && !canOfferServices && (
                  <Button
                    className="h-10 px-8 text-lg flex flex-col items-start gap-1"
                    onClick={() => {
                      window.location.href = '/register?redirect=/customer/dashboard';
                    }}
                    aria-label="Book an appointment as a customer"
                    suppressHydrationWarning
                  >
                    <span>{t('buttons.book_appointment')}</span>
                    <span className="text-xs text-gray-500">(Customer)</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">{t('chat.header')}</h2>
              <HydrationSafeButton 
                onClick={() => setShowAIChat(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </HydrationSafeButton>
            </div>
            <div className="p-6">
              <RealAIChat />
            </div>
          </div>
        </div>
      )}

      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">{t('demo.platform_title')}</h2>
              <HydrationSafeButton 
                onClick={() => setShowDemo(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </HydrationSafeButton>
            </div>
            <div className="p-6">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🎬</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">{t('demo.experience_title')}</h3>
                <p className="text-gray-600 mb-6">{t('demo.experience_body')}</p>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">🎯 {t('demo.step1.title')}</h4>
                    <p className="text-sm text-gray-600">{t('demo.step1.body')}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">📍 {t('demo.step2.title')}</h4>
                    <p className="text-sm text-gray-600">{t('demo.step2.body')}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">💳 {t('demo.step3.title')}</h4>
                    <p className="text-sm text-gray-600">{t('demo.step3.body')}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">✅ {t('demo.step4.title')}</h4>
                    <p className="text-sm text-gray-600">{t('demo.step4.body')}</p>
                  </div>
                </div>
                <div className="mt-8 flex gap-4 justify-center">
                  <HydrationSafeButton 
                    onClick={() => {
                      setShowDemo(false)
                      setShowTour(true)
                    }}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {t('buttons.start_interactive_tour')}
                  </HydrationSafeButton>
                  <HydrationSafeButton 
                    onClick={() => setShowDemo(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {t('buttons.close')}
                  </HydrationSafeButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

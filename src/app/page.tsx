'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/useI18n'
import { useAuth } from '../../hooks/useAuth'
import { 
  LocaleSelector, 
  RealTimeBookingChat, 
  BigActionButton, 
  AIRadiusScaling,
  GuidedTourManager,
  SimpleTourButton
} from '@/components'
import { SimpleThemeToggle } from '@/components/ThemeSwitcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayCircle, Briefcase } from 'lucide-react'

export default function HomePage() {
  const { t, formatCurrency, locale } = useI18n()
  const { 
    isAuthenticated, 
    canBookServices, 
    canOfferServices, 
    loading 
  } = useAuth()
  const [showTour, setShowTour] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Language Selector */}
      <div className="absolute top-4 left-4">
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
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Book any service, anywhere, instantly. One-click booking with AI assistance and {formatCurrency(100)} commitment fee guarantee.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {loading ? (
              // Loading state - show skeleton buttons
              <>
                <div className="h-10 w-32 bg-muted animate-pulse rounded-md"></div>
                <div className="h-10 w-32 bg-muted animate-pulse rounded-md"></div>
              </>
            ) : !isAuthenticated ? (
              // Not logged in - show onboarding buttons
              <>
                <a href="/get-started">
                  <Button className="h-10 px-8 text-lg flex items-center gap-2">
                    <PlayCircle className="w-4 h-4" />
                    Start Booking
                  </Button>
                </a>
                <a href="/vendor/onboarding">
                  <Button variant="outline" className="h-10 px-8 text-lg flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    List Your Business
                  </Button>
                </a>
              </>
            ) : (
              // Logged in - show appropriate dashboard buttons based on capabilities
              <>
                {canBookServices && (
                  <a href="/dashboard">
                    <Button variant="outline" className="h-10 px-8 text-lg">
                      📊 Customer Dashboard
                    </Button>
                  </a>
                )}
                {canOfferServices && (
                  <a href="/vendor/dashboard">
                    <Button variant="outline" className="h-10 px-8 text-lg">
                      🏪 Vendor Dashboard
                    </Button>
                  </a>
                )}
                {/* Show onboarding options if user doesn't have those capabilities yet */}
                {!canBookServices && (
                  <a href="/get-started">
                    <Button className="h-10 px-8 text-lg flex items-center gap-2">
                      <PlayCircle className="w-4 h-4" />
                      Start Booking
                    </Button>
                  </a>
                )}
                {!canOfferServices && (
                  <a href="/vendor/onboarding">
                    <Button variant="outline" className="h-10 px-8 text-lg flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      List Your Business
                    </Button>
                  </a>
                )}
              </>
            )}
            <SimpleThemeToggle />
          </div>
        </div>
      </section>

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
          <h2 className="text-3xl font-bold mb-8 text-foreground">Global Scale, Local Feel</h2>
          
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">37</div>
              <div className="text-muted-foreground">Countries Supported</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-secondary mb-2">27</div>
              <div className="text-muted-foreground">Currencies Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-500 mb-2">17</div>
              <div className="text-muted-foreground">Languages & Locales</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
            Ready to Transform Booking?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of businesses already using Bookiji to streamline their booking process.
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
                    Start Booking Now
                  </Button>
                </a>
                <a href="/vendor/onboarding">
                  <Button variant="outline" className="h-10 px-8 text-lg flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    List Your Business
                  </Button>
                </a>
              </>
            ) : (
              // Logged in - show dashboard CTAs based on capabilities
              <>
                {canBookServices && (
                  <a href="/dashboard">
                    <Button className="h-10 px-8 text-lg">
                      Open Customer Dashboard
                    </Button>
                  </a>
                )}
                {canOfferServices && (
                  <a href="/vendor/dashboard">
                    <Button variant="outline" className="h-10 px-8 text-lg">
                      Open Vendor Dashboard
                    </Button>
                  </a>
                )}
                {/* Fallback CTAs if user lacks capabilities */}
                {!canBookServices && !canOfferServices && (
                  <a href="/get-started">
                    <Button className="h-10 px-8 text-lg flex items-center gap-2">
                      <PlayCircle className="w-4 h-4" />
                      Get Started
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
    </div>
  )
} 

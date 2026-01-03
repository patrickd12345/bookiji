'use client'

/**
 * Modern 2025 Homepage Design
 * 
 * Features:
 * - Soothing multi-tonal color palettes
 * - Bold, expressive typography
 * - Dark mode support
 * - Micro-interactions and animations
 * - 3D-inspired visual elements
 * - Mobile-first responsive design
 * - Sustainable performance optimizations
 */

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/lib/i18n/useI18n'
import { useAuth } from '../../hooks/useAuth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { LogOut, LogIn } from 'lucide-react'

// Lazy load SupportChat to reduce initial bundle size
const SupportChat = dynamic(() => import('@/components').then(mod => ({ default: mod.SupportChat })), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-muted-foreground">Loading chat...</div>
})
import { 
  Sparkles, 
  Zap, 
  Shield, 
  Globe, 
  ArrowRight, 
  CheckCircle2,
  Search,
  MessageSquare,
  Calendar,
  MapPin,
  TrendingUp
} from 'lucide-react'

export default function HomePageModern2025() {
  const { t, formatCurrency } = useI18n()
  const { isAuthenticated, canBookServices, canOfferServices } = useAuth()
  const router = useRouter()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isDark, setIsDark] = useState(false)
  const [showSupportChat, setShowSupportChat] = useState(false)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])

  const handleSignOut = async () => {
    const supabase = supabaseBrowserClient()
    if (supabase) {
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  // Track mouse for parallax effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Detect dark mode preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const features = [
    {
      icon: Zap,
      title: 'AI-Powered Booking',
      description: 'Natural language conversation to find and book services instantly',
      gradient: 'from-yellow-400 via-orange-500 to-red-500',
    },
    {
      icon: Shield,
      title: '$1 Commitment Fee',
      description: 'Guaranteed bookings with minimal commitment, maximum protection',
      gradient: 'from-green-400 via-emerald-500 to-teal-500',
    },
    {
      icon: MapPin,
      title: 'Privacy-First Maps',
      description: 'Smart radius scaling finds nearby services while protecting provider privacy',
      gradient: 'from-blue-400 via-indigo-500 to-purple-500',
    },
    {
      icon: Globe,
      title: 'Universal Platform',
      description: '37 countries, 27 currencies, 17 languages - truly global',
      gradient: 'from-cyan-400 via-blue-500 to-indigo-500',
    },
  ]

  const stats = [
    { value: '37', label: 'Countries', icon: Globe },
    { value: '27', label: 'Currencies', icon: TrendingUp },
    { value: '17', label: 'Languages', icon: MessageSquare },
  ]

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50'
    }`}>
      {/* Sign In / Log Out Button - Top Right, aligned with NotifyForm button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-4 right-6 z-50"
      >
        {isAuthenticated ? (
          <motion.button
            onClick={handleSignOut}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 transition-all"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Log Out</span>
          </motion.button>
        ) : (
          <Link href="/login">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 transition-all"
              aria-label="Sign in"
            >
              <LogIn className="w-4 h-4" />
              <span className="text-sm font-medium">Sign In</span>
            </motion.button>
          </Link>
        )}
      </motion.div>

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
          animate={{
            x: mousePosition.x,
            y: mousePosition.y,
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pink-400/20 to-orange-400/20 rounded-full blur-3xl"
          animate={{
            x: -mousePosition.x * 0.5,
            y: -mousePosition.y * 0.5,
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
      </div>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ opacity, scale }}
        className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20"
      >
        <div className="max-w-7xl mx-auto text-center z-10">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              Universal Booking Platform
            </span>
          </motion.div>

          {/* Main Headline - Bold Typography */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={`text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Book Any Service,
            </span>
            <br />
            <span className={isDark ? 'text-white' : 'text-gray-900'}>
              Anywhere
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className={`text-xl md:text-2xl lg:text-3xl mb-4 font-light ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            {t('home.tagline', { fee: formatCurrency(1) })}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className={`text-lg md:text-xl mb-12 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            AI-powered • Privacy-first • Guaranteed bookings
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            {!isAuthenticated ? (
              <>
                <Link href="/register?role=customer">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      className="group h-16 px-10 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl rounded-2xl"
                    >
                      <span className="flex items-center gap-2">
                        {t('cta.start_booking')}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <span className="block text-xs mt-1 opacity-90">(Customer)</span>
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/register?role=provider">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-16 px-10 text-lg font-semibold border-2 rounded-2xl backdrop-blur-md bg-white/10 hover:bg-white/20"
                    >
                      <span className="flex items-center gap-2">
                        {t('buttons.offer_services')}
                        <ArrowRight className="w-5 h-5" />
                      </span>
                      <span className="block text-xs mt-1 opacity-90">(Provider)</span>
                    </Button>
                  </motion.div>
                </Link>
              </>
            ) : (
              <>
                {canBookServices && (
                  <Link href="/customer/dashboard">
                    <Button size="lg" className="h-16 px-10 text-lg">
                      Go to Dashboard
                    </Button>
                  </Link>
                )}
                {canOfferServices && (
                  <Link href="/vendor/dashboard">
                    <Button size="lg" variant="outline" className="h-16 px-10 text-lg">
                      Professional Portal
                    </Button>
                  </Link>
                )}
              </>
            )}
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="max-w-2xl mx-auto mb-12"
          >
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder={t('home.search_placeholder') || 'Search for services...'}
                className={`w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-2 backdrop-blur-md transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                  isDark
                    ? 'bg-white/10 border-white/20 text-white placeholder-gray-400'
                    : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Grid */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className={`text-4xl md:text-5xl font-black mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Why Bookiji?
            </h2>
            <p className={`text-xl ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              The future of service booking is here
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  className={`group relative p-8 rounded-3xl backdrop-blur-md border-2 transition-all ${
                    isDark
                      ? 'bg-white/5 border-white/10 hover:border-white/30'
                      : 'bg-white/60 border-gray-200 hover:border-gray-300 shadow-xl'
                  }`}
                >
                  {/* Gradient Background on Hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity`} />
                  
                  <div className={`relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className={`text-xl font-bold mb-3 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {feature.title}
                  </h3>
                  
                  <p className={`text-sm leading-relaxed ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {feature.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`relative py-20 px-4 sm:px-6 lg:px-8 ${
        isDark ? 'bg-white/5' : 'bg-white/40'
      } backdrop-blur-md`}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 ${
                    isDark ? 'bg-white/10' : 'bg-gradient-to-br from-blue-500 to-purple-500'
                  }`}>
                    <Icon className={`w-10 h-10 ${
                      isDark ? 'text-blue-400' : 'text-white'
                    }`} />
                  </div>
                  <div className={`text-5xl md:text-6xl font-black mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                  <div className={`text-lg font-medium ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {stat.label}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className={`text-4xl md:text-5xl font-black mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              How It Works
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Search', desc: 'Find services near you', icon: Search },
              { step: '2', title: 'Chat', desc: 'AI helps you book naturally', icon: MessageSquare },
              { step: '3', title: 'Book', desc: 'Secure with $1 commitment', icon: Calendar },
              { step: '4', title: 'Enjoy', desc: 'Get the service you need', icon: CheckCircle2 },
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="relative"
                >
                  <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-xl shadow-lg`}>
                    {item.step}
                  </div>
                  <div className={`p-8 rounded-3xl backdrop-blur-md border-2 ${
                    isDark
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white/60 border-gray-200'
                  }`}>
                    <Icon className={`w-12 h-12 mb-4 ${
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <h3 className={`text-xl font-bold mb-2 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {item.title}
                    </h3>
                    <p className={`text-sm ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={`relative py-24 px-4 sm:px-6 lg:px-8 ${
        isDark ? 'bg-gradient-to-r from-blue-900/50 to-purple-900/50' : 'bg-gradient-to-r from-blue-50 to-purple-50'
      }`}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={`text-4xl md:text-5xl font-black mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Ready to Get Started?
            </h2>
            <p className={`text-xl mb-8 ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Join thousands of users booking services worldwide
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register?role=customer">
                <Button
                  size="lg"
                  className="h-16 px-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl rounded-2xl"
                >
                  {t('cta.start_booking_now')}
                </Button>
              </Link>
              <Link href="/register?role=provider">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 px-12 text-lg font-semibold rounded-2xl"
                >
                  Become a Provider
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Support Chat Button (3D Magenta) - Bottom Right */}
      <motion.button
        ref={helpButtonRef}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.preventDefault()
          e.stopPropagation()
          setShowSupportChat(!showSupportChat)
        }}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full flex items-center justify-center text-white cursor-pointer z-[100]"
        style={{ 
          pointerEvents: 'auto',
          zIndex: 100,
          background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 50%, #9333ea 100%)',
          boxShadow: showSupportChat 
            ? '0 20px 40px rgba(217, 70, 239, 0.4), 0 0 0 4px rgba(217, 70, 239, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.2)'
            : '0 10px 30px rgba(217, 70, 239, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.3)',
          transform: 'perspective(1000px) rotateX(5deg)',
        }}
        whileHover={{ 
          scale: 1.1,
          boxShadow: '0 20px 40px rgba(217, 70, 239, 0.5), 0 0 0 4px rgba(217, 70, 239, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3)',
          y: -2
        }}
        whileTap={{ 
          scale: 0.95,
          boxShadow: '0 5px 15px rgba(217, 70, 239, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.3)'
        }}
        animate={{
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          rotate: {
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }
        }}
        aria-label="Open Support Chat"
        type="button"
        data-testid="help-button"
      >
        <span 
          className="text-3xl font-bold pointer-events-none"
          style={{
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 0 10px rgba(255, 255, 255, 0.2)',
            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))'
          }}
        >
          ?
        </span>
        {/* Glossy highlight overlay */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)',
            mixBlendMode: 'overlay'
          }}
        />
      </motion.button>

      {/* Support Chat Widget */}
      <AnimatePresence>
        {showSupportChat && (
          <motion.div
            className="fixed bottom-24 right-6 z-[99] w-[350px] h-[500px] bg-background rounded-xl shadow-2xl border border-border overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
          >
            <SupportChat onCloseAction={() => setShowSupportChat(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


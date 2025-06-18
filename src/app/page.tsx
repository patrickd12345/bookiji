'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LandingPage() {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = () => {
    if (!message.trim()) return
    setIsTyping(true)
    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false)
    }, 1500)
  }

  const steps = [
    {
      icon: '💬',
      title: 'Tell Bookiji what you need',
      description: 'Use chat, voice, or search to describe your needs',
      color: 'bg-purple-500'
    },
    {
      icon: '🔍',
      title: 'See instant options',
      description: 'Privacy-protected locations and real-time availability',
      color: 'bg-blue-500'
    },
    {
      icon: '💫',
      title: 'Book instantly',
      description: '$1 commitment fee guarantees your spot',
      color: 'bg-green-500'
    },
    {
      icon: '⭐',
      title: 'Build reliability',
      description: 'Earn rewards and improve your booking score',
      color: 'bg-yellow-500'
    }
  ]

  const features = [
    {
      icon: '📍',
      title: 'AI Radius Scaling',
      description: 'Smart location matching based on service density',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: '🎭',
      title: 'Customer Personas',
      description: 'Personalized experience for your booking style',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '🗺️',
      title: 'Map Abstraction',
      description: 'Provider privacy until booking confirmation',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: '🚩',
      title: 'No-Show Protection',
      description: 'Reliable bookings with accountability',
      color: 'from-yellow-500 to-orange-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section with AI Assistant */}
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-12 text-center">
        {/* Logo (optional, for hero) */}
        {/* <div className="flex justify-center mb-4">
          <span className="font-extrabold text-2xl text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📅</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Bookiji</span>
          </span>
        </div> */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[clamp(2rem,5vw,3rem)] leading-tight font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight mb-2"
        >
          Book any service,<br />anywhere. Guaranteed.
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-lg sm:text-xl text-gray-700 font-medium max-w-2xl mx-auto"
        >
          The world's first AI-powered, commitment-based booking platform.
        </motion.p>
        <div className="mt-8">
          <Link href="/register" className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:opacity-90 transition-opacity">
            Get Started
          </Link>
        </div>

        {/* AI Assistant Interface */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-xl mx-auto mt-12"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 scale-110 shadow-purple-400/30 animate-[pulseGlow_2s_infinite]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="text-white text-xl">🧙‍♂️</span>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">AI Booking Assistant</h2>
                <p className="text-sm text-gray-500">I can help you find and book any service</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <span className="text-xl">🎤</span>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <span className="text-xl">📷</span>
                </button>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  🧙‍♂️
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                  <p className="text-gray-700">Hi! I can help you book any service. What are you looking for?</p>
                </div>
              </div>
              {isTyping && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    🧙‍♂️
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Try: Hair appointment near me at 5 PM"
                className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              />
              <button 
                onClick={handleSendMessage}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity"
              >
                Send
              </button>
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors">
                Message near me
              </button>
              <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors">
                Hair appointment today
              </button>
              <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors">
                Wellness services
              </button>
              <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors">
                Available now
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* How It Works */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform -rotate-6`}>
                  <span className="text-2xl transform rotate-6">{step.icon}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[40%] h-[2px] bg-gray-200">
                    <div className="absolute top-1/2 right-0 w-3 h-3 border-t-2 border-r-2 border-gray-200 transform rotate-45 -translate-y-1/2"></div>
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2 text-center">{step.title}</h3>
                <p className="text-gray-600 text-center">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">Features Implemented</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <span className="text-2xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Ready to transform your booking experience?</h2>
          <div className="space-x-4">
            <Link 
              href="/register" 
              className="inline-block px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/vendor/onboarding"
              className="inline-block px-6 py-3 bg-transparent border-2 border-white text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              Become a Provider
            </Link>
          </div>
        </div>
      </div>

      {/* Vendor Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Are you a service provider?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of providers who trust Bookiji to bring them reliable customers and reduce no-shows.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Earn More</h3>
              <p className="text-gray-600">$1 commitment fee reduces no-shows and guarantees serious customers</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Privacy Protected</h3>
              <p className="text-gray-600">Your location stays private until booking is confirmed</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Management</h3>
              <p className="text-gray-600">Simple dashboard to manage bookings and customer communication</p>
            </div>
          </div>
          
          <div className="text-center">
            <Link
              href="/vendor/onboarding"
              className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity font-semibold"
            >
              Start Earning with Bookiji
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              Free to join • No monthly fees • Keep 100% of your earnings
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 
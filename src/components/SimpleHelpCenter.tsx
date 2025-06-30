'use client'

import { useState } from 'react'

interface SimpleHelpCenterProps {
  type: 'customer' | 'vendor'
  defaultTab?: 'guide' | 'faq' | 'tour'
}

export default function SimpleHelpCenter({ type, defaultTab = 'guide' }: SimpleHelpCenterProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  const tabs = [
    {
      id: 'guide',
      name: 'User Guide',
      icon: '📖',
      description: type === 'customer' ? 'Learn how to book and manage services' : 'Complete guide to running your business'
    },
    {
      id: 'faq',
      name: 'FAQ',
      icon: '❓',
      description: 'Frequently asked questions and answers'
    },
    {
      id: 'tour',
      name: 'Interactive Tour',
      icon: '🎯',
      description: 'Take a guided tour of your dashboard'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎓 {type === 'customer' ? 'Customer' : 'Provider'} Help Center
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto mb-4">
              {type === 'customer' 
                ? 'Get the most out of Bookiji with our comprehensive guides, tutorials, and support resources.'
                : 'Everything you need to successfully run your business on Bookiji and maximize your revenue.'
              }
            </p>
            
            {/* Support Promise */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl">🛡️</span>
                <div className="text-center">
                  <h2 className="font-semibold text-blue-900 mb-1">Our Promise: You'll Never Be Left in the Dark</h2>
                  <p className="text-blue-700 text-sm">
                    Smart self-service → AI assistance → Professional support → Direct founder access. 
                    <br />
                    <strong>There's always a path to resolution.</strong>
                  </p>
                </div>
                <span className="text-2xl">✨</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`p-6 rounded-lg border-2 transition-all duration-200 text-left ${
                activeTab === tab.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">{tab.icon}</span>
                <h3 className={`text-lg font-semibold ${
                  activeTab === tab.id ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {tab.name}
                </h3>
              </div>
              <p className={`text-sm ${
                activeTab === tab.id ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {tab.description}
              </p>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'guide' && (
            <div className="p-8">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {type === 'customer' ? '📖 Customer Guide' : '📖 Provider Guide'}
                </h2>
                
                {type === 'customer' ? (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3">🚀 Getting Started</h3>
                      <ul className="space-y-2 text-blue-800">
                        <li>• Create your account and complete your profile</li>
                        <li>• Search for services in your area using the map</li>
                        <li>• Pay the $1 commitment fee to secure your booking</li>
                        <li>• Receive instant confirmation from providers</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-900 mb-3">💳 Payments & Guarantees</h3>
                      <ul className="space-y-2 text-green-800">
                        <li>• $1 commitment fee guarantees your booking slot</li>
                        <li>• Pay service fees directly to provider after completion</li>
                        <li>• Get full refund if provider no-shows</li>
                        <li>• Build loyalty credits for future bookings</li>
                      </ul>
                    </div>
                    
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-purple-900 mb-3">🎯 AI Features</h3>
                      <ul className="space-y-2 text-purple-800">
                        <li>• Chat with our AI to find perfect services</li>
                        <li>• AI expands search radius when needed</li>
                        <li>• Get personalized recommendations</li>
                        <li>• Smart scheduling suggestions</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3">🚀 Getting Started</h3>
                      <ul className="space-y-2 text-blue-800">
                        <li>• Register your business and verify your identity</li>
                        <li>• Set up your services, pricing, and availability</li>
                        <li>• Connect your calendar for automatic scheduling</li>
                        <li>• Go live and start receiving bookings</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-900 mb-3">💰 Revenue & Payments</h3>
                      <ul className="space-y-2 text-green-800">
                        <li>• Keep 100% of your service fees</li>
                        <li>• Customers pay $1 commitment fee (goes to Bookiji)</li>
                        <li>• Get guaranteed payments for confirmed bookings</li>
                        <li>• Weekly payouts via Stripe</li>
                      </ul>
                    </div>
                    
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibent text-purple-900 mb-3">⚙️ Managing Your Business</h3>
                      <ul className="space-y-2 text-purple-800">
                        <li>• Use dual availability modes (subtractive/additive)</li>
                        <li>• Set exceptions and special schedules</li>
                        <li>• View analytics and performance metrics</li>
                        <li>• Build customer loyalty and reviews</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="p-8">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">❓ Frequently Asked Questions</h2>
                
                <div className="space-y-4">
                  {type === 'customer' ? (
                    <>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">What is the $1 commitment fee?</h3>
                        <p className="text-gray-600">The $1 commitment fee guarantees your booking slot and prevents no-shows. It's fully refundable if the provider cancels or doesn't show up.</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">How do I pay for the actual service?</h3>
                        <p className="text-gray-600">You pay the service fee directly to the provider after your appointment is completed. The commitment fee is separate and goes to Bookiji.</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">What if I need to cancel my booking?</h3>
                        <p className="text-gray-600">You can cancel free of charge up to 2 hours before your appointment. Late cancellations forfeit the commitment fee to compensate the provider.</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">How does the AI booking assistant work?</h3>
                        <p className="text-gray-600">Our AI helps you find services by understanding your needs, checking availability, and even expanding the search radius if needed. Just chat naturally!</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">What are loyalty credits?</h3>
                        <p className="text-gray-600">Loyalty credits are earned through successful bookings and referrals. Use them to offset future commitment fees or get discounts on services.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">How much does Bookiji charge providers?</h3>
                        <p className="text-gray-600">Bookiji is free for providers! You keep 100% of your service fees. We only collect the $1 commitment fee from customers.</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">How do I manage my availability?</h3>
                        <p className="text-gray-600">Use our dual availability system: Subtractive mode (set working hours, block exceptions) or Additive mode (manually add available slots).</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">When do I get paid?</h3>
                        <p className="text-gray-600">You receive payment directly from customers after service completion. For digital payments, we process weekly payouts via Stripe.</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">What if a customer doesn't show up?</h3>
                        <p className="text-gray-600">You keep the $1 commitment fee as compensation for your time. You can also mark them as a no-show in your dashboard.</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">Can I integrate my existing calendar?</h3>
                        <p className="text-gray-600">Yes! We support Google Calendar, Outlook, and other major calendar providers. Sync happens automatically every 5 minutes.</p>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="mt-8 p-6 bg-gray-50 rounded-lg text-center">
                  <h3 className="font-semibold text-gray-900 mb-2">Still have questions?</h3>
                  <p className="text-gray-600 mb-4">Contact our support team for personalized help</p>
                  <div className="space-x-4">
                    <a href="mailto:support@bookiji.com" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      📧 Email Support
                    </a>
                    <button className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                      💬 Live Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tour' && (
            <div className="p-8">
              <div className="max-w-4xl mx-auto text-center">
                <div className="mb-8">
                  <div className="text-6xl mb-4">🎯</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Interactive Dashboard Tour
                  </h2>
                  <p className="text-gray-600 text-lg mb-6">
                    {type === 'customer' 
                      ? 'Take a guided tour of your customer dashboard to discover all features and learn how to make the most of your Bookiji experience.'
                      : 'Explore your provider dashboard with our interactive tour. Learn how to manage bookings, track performance, and grow your business.'
                    }
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-600">
                    The tour will highlight key areas of your dashboard and explain how to use each feature effectively.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => {
                        // Navigate to dashboard
                        window.location.href = type === 'customer' ? '/dashboard' : '/vendor/dashboard'
                      }}
                      className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      🚀 Go to Dashboard
                    </button>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">💡</span>
                    <div className="text-left">
                      <h4 className="font-semibold text-yellow-900 mb-1">Pro Tip</h4>
                      <p className="text-yellow-700 text-sm">
                        {type === 'customer' 
                          ? 'Look for the "See it in ACTION" button on the main page to try the guided tour!'
                          : 'The tour button will be available in your dashboard soon. For now, explore the dashboard directly.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
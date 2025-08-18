'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Rocket } from 'lucide-react'

const RealAIChat = dynamic(() => import('./RealAIChat'), { ssr: false })

interface FaqResult {
  id: string
  title: string
  content: string
}

interface SimpleHelpCenterProps {
  type: 'customer' | 'vendor'
  defaultTab?: 'guide' | 'faq' | 'tour'
}

export default function SimpleHelpCenter({ type, defaultTab = 'guide' }: SimpleHelpCenterProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [showChat, setShowChat] = useState(false)
  const [faqSearch, setFaqSearch] = useState('')
  const [faqResults, setFaqResults] = useState<FaqResult[]>([])
  const [faqLoading, setFaqLoading] = useState(false)
  const [showTicket, setShowTicket] = useState(false)
  const [ticketForm, setTicketForm] = useState({ title: '', description: '' })
  const [ticketSubmitting, setTicketSubmitting] = useState(false)

  const tabs: Array<{ id: 'guide' | 'faq' | 'tour'; name: string; icon: string; description: string }> = [
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

  const searchFaq = async () => {
    if (!faqSearch.trim()) return
    setFaqLoading(true)
    try {
      const res = await fetch(`/api/support/faq?search=${encodeURIComponent(faqSearch)}&limit=10`)
      const data = await res.json()
      if (data.ok) setFaqResults(data.data as FaqResult[])
    } catch (e) {
      console.error('FAQ search error', e)
    } finally {
      setFaqLoading(false)
    }
  }

  const submitTicket = async () => {
    if (!ticketForm.title || !ticketForm.description) return
    setTicketSubmitting(true)
    try {
      const res = await fetch('/api/support/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ticketForm, userId: 'anonymous' })
      })
      const data = await res.json()
      if (data.ok) {
        alert('Ticket created! ID: ' + data.ticketId)
        setShowTicket(false)
        setTicketForm({ title: '', description: '' })
      } else {
        alert(data.error)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setTicketSubmitting(false)
    }
  }

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
                  <h2 className="font-semibold text-blue-900 mb-1">Our Promise: You’ll Never Be Left in the Dark</h2>
                  <p className="text-blue-700 text-sm">
                    Smart self-service → AI assistance → Professional support → Direct founder access. 
                    <br />
                    <strong>There’s always a path to resolution.</strong>
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
              onClick={() => setActiveTab(tab.id)}
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
                      <h3 className="flex items-center gap-1 text-lg font-semibold text-blue-900 mb-3"><Rocket className="w-4 h-4" /> Getting Started</h3>
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
                      <h3 className="flex items-center gap-1 text-lg font-semibold text-blue-900 mb-3"><Rocket className="w-4 h-4" /> Getting Started</h3>
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
                
                {/* Search box */}
                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    placeholder="Search the knowledge base…"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded"
                  />
                  <button onClick={searchFaq} className="px-4 py-2 bg-blue-600 text-white rounded">Search</button>
                </div>

                {faqLoading && <p className="text-gray-500 mb-4">Searching…</p>}

                {/* Quick KB Answers */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">💳 How does the $1 commitment fee work?</h3>
                    <p className="text-blue-800 text-sm">
                      The $1 commitment fee is a non-refundable charge that secures your booking slot. This fee goes to Bookiji and helps reduce no-shows by ensuring serious bookings. The full service payment is handled separately with your provider.
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">🔄 Can I change or cancel my booking?</h3>
                    <p className="text-green-800 text-sm">
                      Changes and cancellations must be arranged directly with your service provider by phone. The $1 commitment fee is non-refundable, but your provider may offer flexibility for rescheduling.
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">📱 How do I contact my provider?</h3>
                    <p className="text-purple-800 text-sm">
                      After booking confirmation, you&apos;ll receive your provider&apos;s contact information including phone number and email. Use these details to coordinate directly with your provider.
                    </p>
                  </div>
                  
                  <div className="bg-orange-50 p-6 rounded-lg">
                                         <h3 className="text-lg font-semibold text-orange-900 mb-3">🎯 What if my provider doesn&apos;t show up?</h3>
                     <p className="text-orange-800 text-sm">
                       If your provider no-shows, contact Bookiji support immediately. We&apos;ll investigate and may refund your $1 commitment fee. Your provider will also face consequences for reliability.
                     </p>
                  </div>
                </div>

                {faqResults.length > 0 && (
                  <div className="space-y-4 mb-8">
                    {faqResults.map((item) => (
                      <div key={item.id} className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-gray-600" dangerouslySetInnerHTML={{ __html: item.content }} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  {type === 'customer' ? (
                    <>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">What is the $1 booking fee?</h3>
                        <p className="text-gray-600">The $1 booking fee confirms your reservation and prevents no‑shows. It is <strong>charged only when your booking is confirmed</strong> and is <strong>non‑refundable</strong>.</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">How do I pay for the actual service?</h3>
                        <p className="text-gray-600">You pay the service price directly to the provider after your appointment is completed. Bookiji only processes the <strong>$1 booking fee</strong> to confirm your reservation.</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">What if I need to cancel my booking?</h3>
                        <p className="text-gray-600">You can cancel at any time via your dashboard. The <strong>$1 booking fee is non‑refundable</strong> and remains the same regardless of cancellation timing.</p>
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
                        <p className="text-gray-600">Bookiji is free for providers! You keep 100 % of your service fees. We only collect the $1 commitment fee from customers.</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">How do I manage my availability?</h3>
                        <p className="text-gray-600">Use our dual availability system: Subtractive mode (set working hours, block exceptions) or Additive mode (manually add available slots).</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">When do I get paid?</h3>
                        <p className="text-gray-600">You receive payment directly from customers after service completion. Bookiji does not process the final service payment - only the $1 commitment fee.</p>
                      </div>
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">What if a customer doesn’t show up?</h3>
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
                    <button
                      onClick={() => setShowChat(true)}
                      className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                      💬 Live Chat
                    </button>
                    <button
                      onClick={() => setShowTicket(true)}
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                      📝 Open Ticket
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
                        window.location.href = type === 'customer' ? '/customer/dashboard' : '/vendor/dashboard'
                      }}
                      className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <Rocket className="inline w-4 h-4 mr-1" /> Go to Dashboard
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
                          ? 'Look for the “See it in ACTION” button on the main page to try the guided tour!'
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

      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-xl max-w-full w-full sm:w-[600px] shadow-lg">
            <div className="flex justify-end mb-2">
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowChat(false)}>
                Close
              </button>
            </div>
            <RealAIChat />
          </div>
        </div>
      )}

      {showTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create Support Ticket</h3>
            <input
              type="text"
              placeholder="Short Title"
              value={ticketForm.title}
              onChange={(e)=>setTicketForm({...ticketForm,title:e.target.value})}
              className="w-full mb-3 px-3 py-2 border rounded"
            />
            <textarea
              rows={4}
              placeholder="Describe your issue"
              value={ticketForm.description}
              onChange={(e)=>setTicketForm({...ticketForm,description:e.target.value})}
              className="w-full mb-3 px-3 py-2 border rounded"
            />
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowTicket(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button disabled={ticketSubmitting} onClick={submitTicket} className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50">{ticketSubmitting?'Submitting…':'Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
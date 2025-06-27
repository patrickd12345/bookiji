'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditBooklet, EnhancedPaymentModal } from '@/components'

export default function CreditsDemoPage() {
  const [showCreditBooklet, setShowCreditBooklet] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [userCredits, setUserCredits] = useState(750) // $7.50 starting balance

  const mockBookingDetails = {
    id: 'booking_demo_123',
    service: 'Premium Haircut & Style',
    provider: 'Elite Hair Studio',
    date: '2024-01-15',
    time: '2:30 PM',
    customerId: 'demo_customer_123',
    amountCents: 1200, // $12.00
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            💎 Credit Booklet System Demo
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            The more you buy, the less you pay per credit!
          </p>
          <div className="bg-white rounded-2xl shadow-lg p-6 inline-block">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🪙</span>
              <div>
                <p className="text-sm text-gray-500">Your Current Balance</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${(userCredits / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Volume Discount Explanation */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📈 Volume Discount System</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-700">💰 How You Save</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Larger packages = Lower cost per credit
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Bonus credits on bigger purchases
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Save up to 30% + get 50% bonus credits
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Credits never expire
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-700">🎯 Package Examples</h3>
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">Starter Pack: $5 → $5 credits</div>
                  <div className="text-gray-500">1.00¢ per credit (no discount)</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="font-medium">Popular Pack: $9 → $12 credits</div>
                  <div className="text-purple-700">0.75¢ per credit (25% savings!)</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="font-medium">Ultimate Pack: $70 → $150 credits</div>
                  <div className="text-green-700">0.47¢ per credit (53% savings!)</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-bold text-orange-900">Smart Shopping Tip</p>
                <p className="text-sm text-orange-700">
                  The Ultimate Pack gives you 3x more value than custom amounts! 
                  Perfect for regular users who want maximum savings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreditBooklet(true)}
            className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all text-left"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">💎</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Open Credit Booklet</h3>
                <p className="text-gray-600">Browse packages with volume discounts</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                • See all discount tiers<br/>
                • Compare cost per credit<br/>
                • Choose Stripe or existing credits<br/>
                • Custom amounts available
              </p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPaymentModal(true)}
            className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all text-left"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">💳</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Try Dual Payment</h3>
                <p className="text-gray-600">Pay for booking with credits or card</p>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-green-700">
                • Service: {mockBookingDetails.service}<br/>
                • Cost: ${(mockBookingDetails.amountCents / 100).toFixed(2)}<br/>
                • Current balance: ${(userCredits / 100).toFixed(2)}<br/>
                • {userCredits >= mockBookingDetails.amountCents ? '✅ Can pay with credits' : '❌ Need more credits'}
              </p>
            </div>
          </motion.button>
        </div>

        {/* Price Comparison Table */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Volume Discount Comparison</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Package</th>
                  <th className="text-left py-3 px-4">You Pay</th>
                  <th className="text-left py-3 px-4">Base Credits</th>
                  <th className="text-left py-3 px-4">Bonus Credits</th>
                  <th className="text-left py-3 px-4">Total Value</th>
                  <th className="text-left py-3 px-4">Cost/Credit</th>
                  <th className="text-left py-3 px-4">Savings</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Custom Amount</td>
                  <td className="py-3 px-4">$10.00</td>
                  <td className="py-3 px-4">$10.00</td>
                  <td className="py-3 px-4 text-gray-400">None</td>
                  <td className="py-3 px-4">$10.00</td>
                  <td className="py-3 px-4">1.00¢</td>
                  <td className="py-3 px-4 text-gray-400">No discount</td>
                </tr>
                <tr className="border-b border-gray-100 bg-blue-50">
                  <td className="py-3 px-4 font-medium">Starter Pack</td>
                  <td className="py-3 px-4">$5.00</td>
                  <td className="py-3 px-4">$5.00</td>
                  <td className="py-3 px-4 text-gray-400">None</td>
                  <td className="py-3 px-4">$5.00</td>
                  <td className="py-3 px-4">1.00¢</td>
                  <td className="py-3 px-4 text-gray-400">No discount</td>
                </tr>
                <tr className="border-b border-gray-100 bg-purple-50">
                  <td className="py-3 px-4 font-medium">Popular Pack ⭐</td>
                  <td className="py-3 px-4">$9.00</td>
                  <td className="py-3 px-4">$10.00</td>
                  <td className="py-3 px-4 text-purple-600">+$2.00</td>
                  <td className="py-3 px-4 font-bold">$12.00</td>
                  <td className="py-3 px-4 text-purple-700">0.75¢</td>
                  <td className="py-3 px-4 text-purple-700 font-medium">25% savings</td>
                </tr>
                <tr className="border-b border-gray-100 bg-blue-50">
                  <td className="py-3 px-4 font-medium">Value Pack</td>
                  <td className="py-3 px-4">$20.00</td>
                  <td className="py-3 px-4">$25.00</td>
                  <td className="py-3 px-4 text-blue-600">+$7.50</td>
                  <td className="py-3 px-4 font-bold">$32.50</td>
                  <td className="py-3 px-4 text-blue-700">0.62¢</td>
                  <td className="py-3 px-4 text-blue-700 font-medium">38% savings</td>
                </tr>
                <tr className="border-b border-gray-100 bg-orange-50">
                  <td className="py-3 px-4 font-medium">Premium Pack</td>
                  <td className="py-3 px-4">$37.50</td>
                  <td className="py-3 px-4">$50.00</td>
                  <td className="py-3 px-4 text-orange-600">+$20.00</td>
                  <td className="py-3 px-4 font-bold">$70.00</td>
                  <td className="py-3 px-4 text-orange-700">0.54¢</td>
                  <td className="py-3 px-4 text-orange-700 font-medium">46% savings</td>
                </tr>
                <tr className="bg-green-50 border-2 border-green-200">
                  <td className="py-3 px-4 font-bold">Ultimate Pack 🏆</td>
                  <td className="py-3 px-4 font-bold">$70.00</td>
                  <td className="py-3 px-4">$100.00</td>
                  <td className="py-3 px-4 text-green-600 font-bold">+$50.00</td>
                  <td className="py-3 px-4 font-bold text-green-700">$150.00</td>
                  <td className="py-3 px-4 text-green-700 font-bold">0.47¢</td>
                  <td className="py-3 px-4 text-green-700 font-bold">53% savings!</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>💡 Smart Math:</strong> The Ultimate Pack costs the same as a Premium Pack ($70) 
              but gives you $150 in credits instead of $70. That&apos;s more than 2x the value! 
              Perfect for power users who book frequently.
            </p>
          </div>
        </div>
      </div>

      {/* Credit Booklet Modal */}
      <CreditBooklet
        userId="demo_customer_123"
        isOpen={showCreditBooklet}
        onCloseAction={() => setShowCreditBooklet(false)}
        onCreditsUpdated={(newBalance) => {
          setUserCredits(newBalance * 100)
          console.log('Credits updated:', newBalance)
        }}
      />

      {/* Enhanced Payment Modal */}
      <EnhancedPaymentModal
        isOpen={showPaymentModal}
        onCloseAction={() => setShowPaymentModal(false)}
        bookingDetails={mockBookingDetails}
      />
    </div>
  )
} 
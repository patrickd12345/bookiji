'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '../../lib/stripe'
import StripePayment from './StripePayment'

interface CreditPackage {
  id: string
  name: string
  credits_cents: number
  price_cents: number
  bonus_credits_cents?: number
  description: string
  is_active: boolean
  created_at: string
}

interface UserCredits {
  user_id: string
  balance_cents: number
  total_purchased_cents: number
  total_used_cents: number
  created_at: string
  updated_at: string
}

interface CreditBookletProps {
  userId: string
  isOpen: boolean
  onCloseAction: () => void
  onCreditsUpdated?: (newBalance: number) => void
  initialCredits?: number
}

interface PaymentOption {
  type: 'stripe' | 'credits'
  label: string
  description: string
  icon: string
}

export default function CreditBooklet({ 
  userId,
  isOpen,
  onCloseAction,
  onCreditsUpdated,
  initialCredits = 0
}: CreditBookletProps) {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'credits' | null>(null)
  const [clientSecret, setClientSecret] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCustomAmount, setShowCustomAmount] = useState(false)
  const [customAmount, setCustomAmount] = useState<number>(10)

  const paymentOptions: PaymentOption[] = [
    {
      type: 'stripe',
      label: 'Credit Card',
      description: 'Pay with your credit card or digital wallet',
      icon: '💳'
    },
    {
      type: 'credits',
      label: 'Existing Credits',
      description: 'Use your current credit balance',
      icon: '🪙'
    }
  ]

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch credit packages and user balance
      const [packagesRes, creditsRes] = await Promise.all([
        fetch('/api/credits/packages'),
        fetch(`/api/credits/balance?userId=${userId}`)
      ])

      const packagesData = await packagesRes.json()
      const creditsData = await creditsRes.json()

      if (packagesData.success) {
        setPackages(packagesData.packages)
      }

      if (creditsData.success) {
        setUserCredits(creditsData.credits)
      }
    } catch (error) {
      console.error('Error fetching credit data:', error)
      setError('Failed to load credit information')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, userId, fetchData])

  const calculateSavings = (packageData: CreditPackage) => {
    const totalCredits = packageData.credits_cents + (packageData.bonus_credits_cents || 0)
    const regularPrice = totalCredits // 1:1 ratio normally
    const actualPrice = packageData.price_cents
    const savings = regularPrice - actualPrice
    const savingsPercent = ((savings / regularPrice) * 100).toFixed(0)
    const costPerCredit = actualPrice / totalCredits
    
    return {
      savings: savings / 100,
      savingsPercent: parseInt(savingsPercent),
      costPerCredit: costPerCredit,
      totalValue: totalCredits / 100,
      effectiveSavings: (regularPrice - actualPrice) / 100
    }
  }

  const getBestValueBadge = () => {
    if (packages.length === 0) return null
    
    // Find package with lowest cost per credit
    let bestPackage = packages[0]
    let lowestCost = calculateSavings(bestPackage).costPerCredit
    
    packages.forEach(pkg => {
      const cost = calculateSavings(pkg).costPerCredit
      if (cost < lowestCost) {
        lowestCost = cost
        bestPackage = pkg
      }
    })
    
    return bestPackage.id
  }

  const handlePackageSelect = (pkg: CreditPackage) => {
    setSelectedPackage(pkg)
    setPaymentMethod(null)
    setShowCustomAmount(false)
  }

  const handleCustomAmountSelect = () => {
    setSelectedPackage(null)
    setShowCustomAmount(true)
    setPaymentMethod(null)
  }

  const handlePaymentMethodSelect = async (method: 'stripe' | 'credits') => {
    setPaymentMethod(method)
    setError(null)

    if (method === 'stripe') {
      await createPaymentIntent()
    } else if (method === 'credits') {
      await handleCreditPayment()
    }
  }

  const createPaymentIntent = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          packageId: selectedPackage?.id,
          customAmount: showCustomAmount ? customAmount : undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        if (data.mock) {
          // Handle mock payment success
          handlePaymentSuccess('mock_payment')
        } else {
          setClientSecret(data.clientSecret)
        }
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error creating payment intent:', error)
      setError(error instanceof Error ? error.message : 'Failed to create payment')
    } finally {
      setLoading(false)
    }
  }

  const handleCreditPayment = async () => {
    if (!selectedPackage || !userCredits) return

    setLoading(true)
    try {
      const response = await fetch('/api/credits/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          bookingId: `credit_topup_${Date.now()}`,
          amountCents: selectedPackage.price_cents,
          description: `Purchased ${selectedPackage.name} with existing credits`
        })
      })

      const data = await response.json()

      if (data.success) {
        // Add the new credits
        const addResponse = await fetch('/api/credits/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            packageId: selectedPackage.id,
            useCredits: true
          })
        })

        if (addResponse.ok) {
          handlePaymentSuccess('credits_payment')
        } else {
          throw new Error('Failed to add purchased credits')
        }
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error processing credit payment:', error)
      setError(error instanceof Error ? error.message : 'Failed to process credit payment')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = (paymentIntentId: string) => {
    console.log('Credit purchase successful:', paymentIntentId)
    
    // Refresh user credits
    fetchData()
    
    // Notify parent component
    if (onCreditsUpdated && userCredits) {
      const creditsAdded = selectedPackage 
        ? selectedPackage.credits_cents + (selectedPackage.bonus_credits_cents || 0)
        : customAmount * 100
      onCreditsUpdated((userCredits.balance_cents + creditsAdded) / 100)
    }

    // Reset state
    setSelectedPackage(null)
    setPaymentMethod(null)
    setClientSecret('')
    setShowCustomAmount(false)
    
    // Close after short delay
    setTimeout(() => {
      onCloseAction()
    }, 2000)
  }

  const handlePaymentError = (error: string) => {
    setError(error)
    setPaymentMethod(null)
    setClientSecret('')
  }

  const canAffordWithCredits = (priceInCents: number) => {
    return userCredits && userCredits.balance_cents >= priceInCents
  }

  const bestValueId = getBestValueBadge()

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onCloseAction}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">💎 Credit Booklet</h2>
                <p className="text-gray-600 mt-1">The more you buy, the more you save per credit!</p>
              </div>
              <button
                onClick={onCloseAction}
                className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            {/* Current Balance */}
            {userCredits && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🪙</span>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">Current Balance</p>
                      <p className="text-sm text-gray-500">Available for bookings</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      ${(userCredits.balance_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {userCredits.balance_cents} credits
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {loading && !packages.length ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading credit packages...</p>
              </div>
            ) : (
              <>
                {/* Volume Discount Notice */}
                <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="font-bold text-orange-900">Volume Discounts Available!</p>
                      <p className="text-sm text-orange-700">
                        Larger packages = Lower cost per credit + Bonus credits. Save up to 30% + 50% bonus!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Package Selection */}
                {!selectedPackage && !showCustomAmount && (
                  <div>
                    <h3 className="text-xl font-bold mb-6">Choose Your Credit Package</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                      {packages.map((pkg) => {
                        const savings = calculateSavings(pkg)
                        const isPopular = pkg.id === 'popular'
                        const isBestValue = pkg.id === bestValueId
                        
                        return (
                          <motion.div
                            key={pkg.id}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className={`relative p-5 border-2 rounded-xl cursor-pointer transition-all ${
                              isBestValue
                                ? 'border-green-500 bg-green-50 shadow-lg'
                                : isPopular 
                                ? 'border-purple-500 bg-purple-50 shadow-md' 
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'
                            }`}
                            onClick={() => handlePackageSelect(pkg)}
                          >
                            {/* Badges */}
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 flex flex-col gap-1">
                              {isBestValue && (
                                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                  🏆 Best Value
                                </span>
                              )}
                              {isPopular && !isBestValue && (
                                <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                  ⭐ Popular
                                </span>
                              )}
                            </div>
                            
                            <div className="text-center pt-2">
                              <h4 className="font-bold text-lg mb-2">{pkg.name}</h4>
                              
                              {/* Price */}
                              <div className="mb-3">
                                <span className="text-2xl font-bold text-gray-900">
                                  ${(pkg.price_cents / 100).toFixed(0)}
                                </span>
                              </div>
                              
                              {/* Credits breakdown */}
                              <div className="space-y-1 text-sm mb-3">
                                <p className="text-blue-600 font-semibold">
                                  ${(pkg.credits_cents / 100).toFixed(0)} base credits
                                </p>
                                {pkg.bonus_credits_cents && pkg.bonus_credits_cents > 0 && (
                                  <p className="text-purple-600 font-semibold">
                                    +${(pkg.bonus_credits_cents / 100).toFixed(0)} bonus! 🎁
                                  </p>
                                )}
                                <div className="border-t pt-1">
                                  <p className="text-green-600 font-bold">
                                    Total: ${savings.totalValue.toFixed(0)}
                                  </p>
                                </div>
                              </div>

                              {/* Savings */}
                              {savings.savings > 0 && (
                                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-lg text-xs font-bold mb-3">
                                  Save ${savings.effectiveSavings.toFixed(0)} ({savings.savingsPercent}% off)
                                </div>
                              )}

                              {/* Cost per credit */}
                              <div className="bg-gray-100 px-2 py-1 rounded-lg mb-3">
                                <p className="text-xs font-bold text-gray-700">
                                  {(savings.costPerCredit * 100).toFixed(2)}¢ per credit
                                </p>
                              </div>

                              <p className="text-xs text-gray-600">{pkg.description}</p>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* Custom Amount Option */}
                    <div className="border-t pt-6">
                      <button
                        onClick={handleCustomAmountSelect}
                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all"
                      >
                        <div className="text-center">
                          <span className="text-2xl mb-2 block">🔧</span>
                          <p className="font-medium text-gray-900">Custom Amount</p>
                          <p className="text-sm text-gray-500">No volume discount (1¢ per credit)</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom Amount Input */}
                {showCustomAmount && (
                  <div className="mb-6">
                    <button
                      onClick={() => {
                        setShowCustomAmount(false)
                        setPaymentMethod(null)
                      }}
                      className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
                    >
                      ← Back to packages
                    </button>
                    
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Custom Credit Amount</h3>
                      <div className="flex items-center gap-4">
                        <label className="flex-1">
                          <span className="block text-sm font-medium text-gray-700 mb-2">
                            Amount (USD)
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(Number(e.target.value))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter amount"
                          />
                        </label>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">You&apos;ll receive</p>
                          <p className="text-xl font-bold text-green-600">
                            {customAmount * 100} credits
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          💡 <strong>Tip:</strong> Choose a package above for better value! Custom amounts are 1¢ per credit with no bonuses.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Method Selection */}
                {(selectedPackage || showCustomAmount) && !paymentMethod && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Choose Payment Method</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {paymentOptions.map((option) => {
                        const price = selectedPackage?.price_cents || (customAmount * 100)
                        const isDisabled = option.type === 'credits' && !canAffordWithCredits(price)
                        
                        return (
                          <motion.button
                            key={option.type}
                            whileHover={!isDisabled ? { scale: 1.02 } : {}}
                            whileTap={!isDisabled ? { scale: 0.98 } : {}}
                            disabled={isDisabled}
                            onClick={() => handlePaymentMethodSelect(option.type)}
                            className={`p-4 border-2 rounded-xl text-left transition-all ${
                              isDisabled
                                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{option.icon}</span>
                              <div>
                                <p className="font-medium text-gray-900">{option.label}</p>
                                <p className="text-sm text-gray-500">{option.description}</p>
                                {isDisabled && (
                                  <p className="text-xs text-red-500 mt-1">
                                    Need ${(price / 100).toFixed(2)}, have ${(userCredits?.balance_cents || 0) / 100}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Stripe Payment Form */}
                {paymentMethod === 'stripe' && clientSecret && (
                  <div className="mb-6">
                    <Elements stripe={getStripe()}>
                      <StripePayment
                        clientSecret={clientSecret}
                        bookingId={`credit_purchase_${Date.now()}`}
                        serviceDetails={{
                          service: selectedPackage?.name || `$${customAmount} Credits`,
                          provider: 'Bookiji Credit Store',
                          date: new Date().toLocaleDateString(),
                          time: new Date().toLocaleTimeString(),
                        }}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                        onCancel={() => {
                          setPaymentMethod(null)
                          setClientSecret('')
                        }}
                      />
                    </Elements>
                  </div>
                )}

                {/* Credit Payment Processing */}
                {paymentMethod === 'credits' && loading && (
                  <div className="mb-6 text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Processing credit payment...</p>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="text-center text-sm text-gray-600">
              <p className="font-semibold">💎 Credits never expire • 🔒 Secure payments • ⚡ Instant top-up</p>
              <p className="mt-2 text-xs">
                💡 <strong>Smart Tip:</strong> Larger packages offer significantly better value per credit plus bonus credits!
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Plus, Minus, DollarSign, History } from 'lucide-react'
import Link from 'next/link'

interface CreditBalance {
  balance_cents: number
  balance_dollars: number
}

interface CreditTransaction {
  id: string
  amount_cents: number
  type: 'purchase' | 'usage' | 'refund' | 'bonus'
  description: string
  date: string
}

export default function CustomerCreditsPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCredits = async () => {
      try {
        const response = await fetch('/api/credits/balance')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setBalance(data.credits)
            setTransactions(data.credits.recent_transactions || [])
          }
        }
      } catch (error) {
        console.error('Error loading credits:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCredits()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  const currentBalance = balance?.balance_dollars || 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Credits</h1>
        <p className="text-gray-600">Manage your account balance</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-white mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm mb-1">Available Balance</p>
            <p className="text-4xl font-bold">${currentBalance.toFixed(2)}</p>
          </div>
          <CreditCard className="w-16 h-16 text-blue-200" />
        </div>
        <Link
          href="/demo/credits"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Purchase Credits
        </Link>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5" />
            Transaction History
          </h2>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {transaction.type === 'purchase' || transaction.type === 'bonus' ? (
                    <Plus className="w-5 h-5 text-green-500" />
                  ) : (
                    <Minus className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      transaction.type === 'purchase' || transaction.type === 'bonus'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'purchase' || transaction.type === 'bonus' ? '+' : '-'}
                    ${Math.abs(transaction.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


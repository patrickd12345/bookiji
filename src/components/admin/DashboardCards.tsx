'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Users, Calendar, DollarSign, AlertTriangle } from 'lucide-react'

interface DashboardStats {
  activeUsers: number
  bookingsToday: number
  revenue: number
  errors: number
}

interface DashboardCardsProps {
  stats: DashboardStats
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    }
  })
}

const cards = [
  {
    title: 'Active Users',
    value: 'activeUsers',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    href: '/admin/customers'
  },
  {
    title: 'Bookings Today',
    value: 'bookingsToday',
    icon: Calendar,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    href: '/admin/bookings'
  },
  {
    title: 'Revenue',
    value: 'revenue',
    icon: DollarSign,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    href: '/admin/analytics'
  },
  {
    title: 'Errors',
    value: 'errors',
    icon: AlertTriangle,
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    href: '/admin/performance'
  }
]

export default function DashboardCards({ stats }: DashboardCardsProps) {
  // Add error handling for undefined stats
  if (!stats) {
    console.error('DashboardCards: stats prop is undefined')
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-red-50 rounded-2xl p-6 shadow-sm border border-red-200">
          <p className="text-red-600">Error: Dashboard stats not available</p>
          <p className="text-xs text-red-500">Props received: {JSON.stringify({ stats })}</p>
        </div>
      </div>
    )
  }

  const getValue = (valuePath: string) => {
    const path = valuePath.split('.')
    let result: any = stats
    for (const key of path) {
      result = result[key]
    }
    return result
  }

  const formatValue = (title: string, value: any) => {
    if (title === 'Revenue') {
      return `$${value.toLocaleString()}`
    }
    return value.toLocaleString()
  }

  return (
    <div data-testid="dashboard-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        const value = getValue(card.value)
        
        const CardContent = (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${card.textColor}`}>
                  {formatValue(card.title, value)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${card.color} flex items-center justify-center shadow-lg`}>
                <Icon className="text-white" size={24} />
              </div>
            </div>
            
            {/* Trend indicator */}
            <div className="mt-4 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${card.textColor.replace('text-', 'bg-')}`}></div>
              <span className="text-xs text-gray-500">
                {index === 0 && '+12% from last week'}
                {index === 1 && '+8% from yesterday'}
                {index === 2 && '+15% from last month'}
                {index === 3 && '-2 from yesterday'}
              </span>
            </div>
          </>
        )
        
        return (
          <motion.div
            key={card.title}
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className={`${card.bgColor} rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 ${card.href ? 'cursor-pointer' : ''}`}
          >
            {card.href ? (
              <Link href={card.href} className="block">
                {CardContent}
              </Link>
            ) : (
              CardContent
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

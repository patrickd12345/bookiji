'use client'

import { useState, useEffect } from 'react'

interface RescheduleCountdownProps {
  expiresAt: string
  onExpired: () => void
}

export default function RescheduleCountdown({ expiresAt, onExpired }: RescheduleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isExpired, setIsExpired] = useState<boolean>(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const difference = expiry - now

      if (difference <= 0) {
        setIsExpired(true)
        onExpired()
        return 0
      }

      return Math.floor(difference / 1000)
    }

    // Calculate immediately
    setTimeLeft(calculateTimeLeft())

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt, onExpired])

  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
        <div className="text-red-800 font-medium">⏰ Hold Expired</div>
        <div className="text-red-600 text-sm">Your original booking has been restored</div>
      </div>
    )
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center justify-center gap-2">
        <div className="text-blue-800 font-medium">⏰ Reschedule Hold Active</div>
        <div className="text-blue-600 text-sm">
          {minutes}:{seconds.toString().padStart(2, '0')} remaining
        </div>
      </div>
      <div className="text-blue-600 text-xs text-center mt-1">
        Complete your reschedule before time runs out
      </div>
      
      {/* Progress bar */}
      <div className="mt-2 bg-blue-200 rounded-full h-1">
        <div 
          className="bg-blue-600 h-1 rounded-full transition-all duration-1000"
          style={{ 
            width: `${Math.max(0, (timeLeft / (15 * 60)) * 100)}%` 
          }}
        />
      </div>
    </div>
  )
}

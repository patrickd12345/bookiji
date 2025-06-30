'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookingPaymentModal } from './BookingPaymentModal'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  bookingData?: any
}

interface BookingData {
  service: string
  date: string
  time: string
  location: string
  notes?: string
}

export default function RealTimeBookingChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m Bookiji, your AI booking assistant. I can help you find and book any service. What are you looking for?',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentBooking, setCurrentBooking] = useState<any>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [customerId, setCustomerId] = useState('550e8400-e29b-41d4-a716-446655440000') // Proper UUID format

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    try {
      // First, extract booking information from the message
      const bookingData = await extractBookingData(inputMessage)
      
      // If it's a booking request, try to create the booking
      if (bookingData.intent === 'booking_request' && bookingData.service) {
        const bookingResult = await createBooking(bookingData)
        
        if (bookingResult.success) {
          // Show payment modal
          setCurrentBooking({
            id: bookingResult.bookingId,
            service: bookingData.service,
            provider: 'Available Provider',
            date: bookingData.date || 'Today',
            time: bookingData.time || 'Available time',
            customerId
          })
          setShowPaymentModal(true)
          
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Great! I found availability for ${bookingData.service}. I've created your booking and opened the payment form. Please complete the $1 commitment fee to confirm your appointment.`,
            timestamp: new Date(),
            bookingData: bookingResult
          }
          setMessages(prev => [...prev, aiMessage])
        } else {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I'm sorry, I couldn't find availability for ${bookingData.service} at that time. Would you like to try a different time or service?`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, aiMessage])
        }
      } else {
        // Regular AI chat response
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: inputMessage
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to get AI response')
        }

        const data = await response.json()
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('AI chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const extractBookingData = async (message: string): Promise<BookingData & { intent: string }> => {
    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Extract booking information from: "${message}"`,
          prompt: 'bookingExtraction'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to extract booking data')
      }

      const data = await response.json()
      
      // Try to parse JSON from AI response
      try {
        const extracted = JSON.parse(data.response)
        return {
          service: extracted.service || '',
          date: extracted.date || '',
          time: extracted.time || '',
          location: extracted.location || '',
          notes: extracted.notes || '',
          intent: extracted.intent || 'information_request'
        }
      } catch {
        // Fallback: simple keyword detection
        const lowerMessage = message.toLowerCase()
        const isBookingRequest = lowerMessage.includes('book') || 
                                lowerMessage.includes('appointment') || 
                                lowerMessage.includes('schedule')
        
        return {
          service: '',
          date: '',
          time: '',
          location: '',
          notes: '',
          intent: isBookingRequest ? 'booking_request' : 'information_request'
        }
      }
    } catch (error) {
      console.error('Error extracting booking data:', error)
      return {
        service: '',
        date: '',
        time: '',
        location: '',
        notes: '',
        intent: 'information_request'
      }
    }
  }

  const createBooking = async (bookingData: BookingData) => {
    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          service: bookingData.service,
          location: bookingData.location || 'Default Location',
          date: bookingData.date || new Date().toISOString().split('T')[0],
          time: bookingData.time || '10:00',
          notes: bookingData.notes
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create booking')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error creating booking:', error)
      return { success: false, error: 'Booking creation failed' }
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handlePaymentSuccess = (paymentIntentId: string) => {
    const successMessage: Message = {
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: '🎉 Payment successful! Your booking is confirmed. You\'ll receive booking details and provider contact information shortly.',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, successMessage])
  }

  const handlePaymentError = (error: Error) => {
    const errorMessage: Message = {
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: `Payment failed: ${error.message}. Please try again or contact support.`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, errorMessage])
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 scale-110 shadow-purple-400/30 animate-[pulseGlow_2s_infinite]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-white text-xl">🚀</span>
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Real-Time Booking Assistant</h2>
            <p className="text-sm text-gray-500">AI-powered booking with instant payment</p>
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

        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  🚀
                </div>
              )}
              <div className={`rounded-2xl p-4 max-w-[80%] ${
                message.role === 'user' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-none' 
                  : 'bg-gray-100 text-gray-700 rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-sm">👤</span>
                </div>
              )}
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                🚀
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Try: Book a haircut for tomorrow at 2 PM"
            className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            disabled={isTyping}
          />
          <button 
            onClick={handleSendMessage}
            disabled={isTyping || !inputMessage.trim()}
            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <button 
            onClick={() => handleQuickPrompt('Book a haircut for today')}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors"
          >
            Book a haircut for today
          </button>
          <button 
            onClick={() => handleQuickPrompt('I need a massage tomorrow')}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors"
          >
            I need a massage tomorrow
          </button>
          <button 
            onClick={() => handleQuickPrompt('Book a cleaning service')}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors"
          >
            Book a cleaning service
          </button>
          <button 
            onClick={() => handleQuickPrompt('What services are available?')}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors"
          >
            What services are available?
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      <BookingPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        bookingId={currentBooking?.id}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
        serviceDetails={{
          name: currentBooking?.service || '',
          price: 100, // Set your actual price
          duration: 60 // Set your actual duration
        }}
      />
    </>
  )
}
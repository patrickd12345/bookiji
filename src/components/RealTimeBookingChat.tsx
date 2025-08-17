'use client'

import React, { useState, type MouseEvent, type KeyboardEvent, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookingPaymentModal } from './BookingPaymentModal'
import { Zap } from 'lucide-react'
import { useI18n } from '@/lib/i18n/useI18n'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  bookingData?: BookingResult
}

interface BookingData {
  service: string
  date: string
  time: string
  location: string
  notes?: string
}

interface BookingResult {
  success: boolean
  bookingId?: string
  error?: string
}

export default function RealTimeBookingChat() {
  const { t } = useI18n()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentBooking, setCurrentBooking] = useState<{ id: string; service: string; provider: string; date: string; time: string; customerId: string } | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const customerId = '550e8400-e29b-41d4-a716-446655440000' // Proper UUID format

  // Initialize messages after component mounts to avoid hydration mismatch
  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: t('chat.greeting'),
        timestamp: new Date()
      }
    ])
  }, [t])

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
            id: bookingResult.bookingId || '',
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

  const createBooking = async (bookingData: BookingData): Promise<BookingResult> => {
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

      const data: BookingResult = await response.json()
      return data
    } catch (error) {
      console.error('Error creating booking:', error)
      return { success: false, error: 'Booking creation failed' }
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt)
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handlePaymentSuccess = () => {
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
      <div className="bg-card rounded-2xl shadow-xl p-8 border scale-110 shadow-purple-400/30 animate-[pulseGlow_2s_infinite]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">{t('chat.header')}</h2>
            <p className="text-sm text-muted-foreground">{t('chat.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(evt: MouseEvent<HTMLButtonElement>) => {
                evt.preventDefault();
                // Show voice input info
                const voiceInfo = document.createElement('div');
                voiceInfo.className = 'fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
                voiceInfo.innerHTML = `
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-xl">🎤</span>
                    <strong>Voice Input</strong>
                  </div>
                  <p class="text-sm">Voice input will be available in the next update. For now, you can type your requests or use the quick prompts below.</p>
                  <button onclick="this.parentElement.remove()" class="mt-2 text-xs underline">Close</button>
                `;
                document.body.appendChild(voiceInfo);
                setTimeout(() => voiceInfo.remove(), 5000);
              }}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              title={t('chat.voice_tooltip')}
              suppressHydrationWarning>
              <span className="text-xl">🎤</span>
            </button>
            <button
              onClick={(evt: MouseEvent<HTMLButtonElement>) => {
                evt.preventDefault();
                // Show image attachment info
                const imageInfo = document.createElement('div');
                imageInfo.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 max-h-sm';
                imageInfo.innerHTML = `
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-xl">📷</span>
                    <strong>Image Attachment</strong>
                  </div>
                  <p class="text-sm">Image attachments will be available soon. You can describe what you need or use our AI chat to get recommendations.</p>
                  <button onclick="this.parentElement.remove()" class="mt-2 text-xs underline">Close</button>
                `;
                document.body.appendChild(imageInfo);
                setTimeout(() => imageInfo.remove(), 5000);
              }}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              title={t('chat.image_tooltip')}
              suppressHydrationWarning>
              <span className="text-xl">📷</span>
            </button>
          </div>
        </div>

        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {messages.map((message: Message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-primary" />
                </div>
              )}
              <div className={`rounded-2xl p-4 max-w-[80%] ${
                message.role === 'user' 
                  ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-br-none' 
                  : 'bg-muted text-foreground rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary-foreground text-sm">👤</span>
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
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-none p-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chat.input_placeholder')}
            className="flex-1 px-4 py-3 bg-muted border-0 rounded-xl focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            disabled={isTyping}
            suppressHydrationWarning
          />
          <button 
            onClick={handleSendMessage}
            disabled={isTyping || !inputMessage.trim()}
            className="px-4 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            suppressHydrationWarning
          >
            {t('chat.send')}
          </button>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <button 
            onClick={() => handleQuickPrompt(t('chat.quick_1'))}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm text-muted-foreground transition-colors"
            suppressHydrationWarning
          >
            {t('chat.quick_1')}
          </button>
          <button 
            onClick={() => handleQuickPrompt(t('chat.quick_2'))}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm text-muted-foreground transition-colors"
            suppressHydrationWarning
          >
            {t('chat.quick_2')}
          </button>
          <button 
            onClick={() => handleQuickPrompt(t('chat.quick_3'))}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm text-muted-foreground transition-colors"
            suppressHydrationWarning
          >
            {t('chat.quick_3')}
          </button>
          <button 
            onClick={() => handleQuickPrompt(t('chat.quick_4'))}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm text-muted-foreground transition-colors"
            suppressHydrationWarning
          >
            {t('chat.quick_4')}
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      <BookingPaymentModal
        isOpen={showPaymentModal}
        onCloseAction={() => setShowPaymentModal(false)}
        bookingId={currentBooking?.id ?? ''}
        onPaymentSuccessAction={handlePaymentSuccess}
        onPaymentErrorAction={handlePaymentError}
        serviceDetails={{
          name: currentBooking?.service || '',
          price: 100, // Set your actual price
          duration: 60 // Set your actual duration
        }}
      />
    </>
  )
}
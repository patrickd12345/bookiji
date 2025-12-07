'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabaseBrowserClient } from '@/lib/supabaseClient'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// Proper interfaces for SpeechRecognition API
interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
      }
    }
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

export default function RealAIChat() {
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
  const [isRecording, setIsRecording] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Speech recognition setup
  useEffect(() => {
    let recognition: SpeechRecognition | null = null
    if (isRecording) {
      const SpeechRecognitionCtor =
        (window as Window).SpeechRecognition || (window as Window).webkitSpeechRecognition
      if (!SpeechRecognitionCtor) {
        alert('Speech recognition not supported in this browser.')
        setIsRecording(false)
        return
      }
      recognition = new SpeechRecognitionCtor()
      if (recognition) {
        recognition.lang = 'en-US'
        recognition.continuous = false
        recognition.interimResults = false
        recognition.onresult = (e: SpeechRecognitionEvent) => {
          const transcript = e.results[0][0].transcript
          setInputMessage((prev) => (prev ? prev + ' ' + transcript : transcript))
        }
        recognition.onend = () => setIsRecording(false)
      }
      recognition?.start()
    }
    return () => {
      if (recognition && isRecording) recognition.stop()
    }
  }, [isRecording])

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

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
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
          <button
            onClick={() => setIsRecording((prev) => !prev)}
            className="p-2 hover:bg-gray-100 rounded-full">
            <span className="text-xl">{isRecording ? '◼️' : '🎤'}</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-100 rounded-full">
            <span className="text-xl">📷</span>
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              
              const supabase = supabaseBrowserClient()
              if (!supabase) {
                alert('Supabase client not available')
                return
              }
              
              // upload
              const filePath = `${Date.now()}_${file.name}`
              const { error } = await supabase.storage.from('chat-images').upload(filePath, file)
              if (!error) {
                const { data } = supabase.storage.from('chat-images').getPublicUrl(filePath)
                setInputMessage((prev) => (prev ? prev + ' ' + data.publicUrl : data.publicUrl))
              } else {
                alert('Image upload failed')
              }
            }}
          />
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
                🧙‍♂️
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
              🧙‍♂️
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
          placeholder="Try: Hair appointment near me at 5 PM"
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
          onClick={() => handleQuickPrompt('Hair appointment near me')}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors"
        >
          Hair appointment near me
        </button>
        <button 
          onClick={() => handleQuickPrompt('Hair appointment today')}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors"
        >
          Hair appointment today
        </button>
        <button 
          onClick={() => handleQuickPrompt('Wellness services')}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors"
        >
          Wellness services
        </button>
        <button 
          onClick={() => handleQuickPrompt('Available now')}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors"
        >
          Available now
        </button>
      </div>
    </div>
  )
} 
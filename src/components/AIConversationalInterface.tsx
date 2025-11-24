'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAsyncOperation } from '@/hooks/useAsyncState'
import { LoadingSpinner, InlineLoader } from '@/components/ui/LoadingSpinner'
import { NetworkError } from '@/components/ui/ErrorDisplay'
import { InfoMessage } from '@/components/ui/StatusMessage'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useGuidedTour } from '@/components/guided-tours/GuidedTourProvider'
import { aiChatTutorialSteps, aiChatTutorialTourId } from '@/tours/aiChatTutorial'
import VoiceInput from './VoiceInput'
import { Mic } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isTyping?: boolean
}

interface AIConversationalInterfaceProps {
  className?: string
  initialMessage?: string
  placeholder?: string
  maxMessages?: number
  onMessageSent?: (message: string) => void
  onResponseReceived?: (response: string) => void
}

export default function AIConversationalInterface({
  className = '',
  initialMessage = '',
  placeholder = 'Ask me anything about booking services...',
  maxMessages = 50,
  onMessageSent,
  onResponseReceived
}: AIConversationalInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState(initialMessage)
  const [isTyping, setIsTyping] = useState(false)
  const [showVoiceInput, setShowVoiceInput] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { startTour, hasCompletedTour } = useGuidedTour()

  // Use the new async operation hook for AI chat
  const aiChat = useAsyncOperation<string>({
    autoReset: true,
    resetDelay: 3000
  })

  useEffect(() => {
    if (!hasCompletedTour(aiChatTutorialTourId)) {
      startTour(aiChatTutorialTourId, aiChatTutorialSteps)
    }
  }, [hasCompletedTour, startTour])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
    }
  }, [inputValue])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev.slice(-maxMessages + 1), userMessage])
    setInputValue('')
    setIsTyping(true)
    onMessageSent?.(content.trim())

    try {
      const result = await aiChat.run(async () => {
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content.trim() })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to get AI response')
        }

        const data = await response.json()
        return data.response
      })

      if (result.success && result.data) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.data,
          timestamp: new Date()
        }

        setMessages(prev => [...prev.slice(-maxMessages + 1), assistantMessage])
        onResponseReceived?.(result.data)
      }
    } catch (error) {
      console.error('AI chat error:', error)
      // Error is handled by the hook
    } finally {
      setIsTyping(false)
    }
  }, [aiChat, maxMessages, onMessageSent, onResponseReceived])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !aiChat.loading) {
      sendMessage(inputValue)
    }
  }, [inputValue, sendMessage, aiChat.loading])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputValue.trim() && !aiChat.loading) {
        sendMessage(inputValue)
      }
    }
  }, [inputValue, sendMessage, aiChat.loading])

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop()
    
    if (lastUserMessage) {
      sendMessage(lastUserMessage.content)
    }
  }, [messages, sendMessage])

  const clearMessages = useCallback(() => {
    setMessages([])
    aiChat.reset()
  }, [aiChat])

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setInputValue(transcript)
    setShowVoiceInput(false)
    // Optional: Auto-send if desired, but letting user review is usually better
    // sendMessage(transcript)
  }, [])

  return (
    <div className={cn('flex flex-col h-full bg-white rounded-lg border shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Assistant</h3>
            <p className="text-sm text-gray-600">Ask me about booking services</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" data-tour="settings">
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            data-tour="booking-button"
            onClick={() => onMessageSent?.('')}
          >
            Book Service
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearMessages}
            disabled={messages.length === 0}
            className="text-xs"
          >
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-tour="response-display">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">🤖</span>
                </div>
              )}
              
              <div
                className={cn(
                  'max-w-[80%] rounded-lg p-3',
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={cn(
                  'text-xs mt-2',
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                )}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 text-sm">👤</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <InlineLoader text="AI is thinking..." />
            </div>
          </motion.div>
        )}

        {/* Error Display */}
        {aiChat.error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div className="max-w-[80%]">
              <NetworkError 
                error={aiChat.error}
                onRetry={retryLastMessage}
                className="text-sm"
              />
            </div>
          </motion.div>
        )}

        {/* Success Message */}
        {aiChat.success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div className="max-w-[80%]">
              <InfoMessage 
                message="Response received successfully"
                className="text-sm"
                autoDismiss
              />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="mb-2 text-xs text-gray-500" data-tour="example-queries">
          Try questions like &quot;Book a haircut tomorrow&quot; or &quot;Find a spa near me&quot;.
        </div>

        {showVoiceInput ? (
          <div className="mb-4">
             <div className="flex justify-between items-center mb-2">
               <span className="text-sm font-medium">Voice Input</span>
               <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={() => setShowVoiceInput(false)}
                 className="h-6 px-2"
               >
                 Cancel
               </Button>
             </div>
             <VoiceInput 
               onTranscriptAction={handleVoiceTranscript}
               onError={(err) => console.error(err)}
               autoStart={true}
             />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                id="aiChatInput"
                data-tour="chat-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                disabled={aiChat.loading}
                className={cn(
                  'w-full resize-none rounded-lg border border-gray-300 p-3 pr-12',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'min-h-[44px] max-h-32'
                )}
                rows={1}
              />
              
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {aiChat.loading ? (
                  <LoadingSpinner size="sm" variant="primary" />
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 text-gray-500"
                    onClick={() => setShowVoiceInput(true)}
                    title="Use voice input"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={!inputValue.trim() || aiChat.loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiChat.loading ? (
                <InlineLoader text="Sending..." />
              ) : (
                <>
                  <span>Send</span>
                  <span className="ml-2">🚀</span>
                </>
              )}
            </Button>
          </form>
        )}
        
        {/* Help Text */}
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
} 

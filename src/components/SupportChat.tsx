'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: { title: string, score: number, url?: string | null }[]
}

// Render message content with clickable markdown links
function renderMessageWithLinks(content: string) {
  // Match markdown links: [text](/path) or [text](http://url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let key = 0;
  
  // Find all matches first
  const matches: Array<{ index: number; text: string; url: string; length: number }> = [];
  let match;
  
  // Reset regex lastIndex to ensure we start from the beginning
  linkRegex.lastIndex = 0;
  while ((match = linkRegex.exec(content)) !== null) {
    matches.push({
      index: match.index,
      text: match[1],
      url: match[2],
      length: match[0].length
    });
  }
  
  // If no links found, return original content
  if (matches.length === 0) {
    return <>{content}</>;
  }
  
  // Build parts array with text and links
  matches.forEach((m) => {
    // Add text before the link
    if (m.index > lastIndex) {
      parts.push(content.substring(lastIndex, m.index));
    }
    
    // Convert full URL to relative path for Next.js Link
    let linkUrl = m.url;
    if (linkUrl.startsWith('http')) {
      try {
        linkUrl = new URL(linkUrl).pathname;
      } catch {
        // Keep original if URL parsing fails
      }
    }
    
    // Add the link
    parts.push(
      <Link
        key={key++}
        href={linkUrl}
        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
      >
        {m.text}
      </Link>
    );
    
    lastIndex = m.index + m.length;
  });
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  
  return <>{parts}</>;
}

export default function SupportChat({ onCloseAction }: { onCloseAction: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am the Bookiji Support Bot. How can I help you today?',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      // Build history from previous messages for context
      const history = messages
        .filter(m => m.role === 'assistant' && 'confidence' in m)
        .map(m => ({ confidence: (m as any).confidence || 0 }))
        .slice(-5); // Keep last 5 for context

      // Add timeout to prevent infinite spinning
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let response;
      try {
        response = await fetch('/api/support/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userMessage.content,
            history: history
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get response: ${response.status}`);
      }

      const data = await response.json()
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || "I'm sorry, I couldn't find an answer to that.",
        sources: data.sources,
        timestamp: new Date(),
        ...(data.confidence !== undefined && { confidence: data.confidence } as any),
        ...(data.escalated && { escalated: true, ticketId: data.ticketId } as any)
      }

      setMessages(prev => [...prev, aiMessage])
      
      // Show escalation message if ticket was created
      if (data.escalated && data.ticketId) {
        console.log('Ticket created:', data.ticketId);
      }
    } catch (error) {
      console.error('Support chat error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMsg.includes('timeout') 
          ? "The request took too long. Please try again with a shorter question."
          : errorMsg.includes('Failed to get response')
          ? "I'm having trouble connecting to the support system right now. Please try again later."
          : `Sorry, I encountered an error: ${errorMsg}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-fuchsia-600 flex items-center justify-center text-white">
            ?
          </div>
          <div>
            <h3 className="font-semibold">Bookiji Support</h3>
            <span className="text-xs text-muted-foreground">Powered by RAG</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onCloseAction}>×</Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-fuchsia-100 flex items-center justify-center text-fuchsia-600 font-bold text-xs">
                AI
              </div>
            )}
            <div className={`rounded-2xl p-3 max-w-[85%] text-sm ${
              message.role === 'user' 
                ? 'bg-primary text-primary-foreground rounded-br-none' 
                : 'bg-muted rounded-tl-none'
            }`}>
              <div className="whitespace-pre-wrap">
                {renderMessageWithLinks(message.content)}
              </div>
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                  <p className="text-xs font-semibold mb-1.5 opacity-70">Sources:</p>
                  <ul className="list-none pl-0 space-y-1">
                    {message.sources.slice(0, 3).map((s, i) => {
                      // Convert full URL to relative path for Next.js Link
                      const url = s.url ? (s.url.startsWith('http') ? new URL(s.url).pathname : s.url) : null;
                      return (
                        <li key={i} className="text-xs">
                          {url ? (
                            <Link 
                              href={url}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-1.5 group cursor-pointer"
                              title={s.title}
                            >
                              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                              <span className="truncate max-w-[250px]">{s.title}</span>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground truncate block max-w-[250px]" title={s.title}>
                              {s.title}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-fuchsia-100 flex items-center justify-center text-fuchsia-600 font-bold text-xs">
                AI
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-none p-3 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
              </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-fuchsia-500 bg-background"
            disabled={isTyping}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isTyping || !inputMessage.trim()}
            className="rounded-full w-10 h-10 p-0 flex items-center justify-center bg-fuchsia-600 hover:bg-fuchsia-700"
          >
            ➤
          </Button>
        </div>
      </div>
    </div>
  )
}





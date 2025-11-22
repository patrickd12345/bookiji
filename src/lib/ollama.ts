// 🧠 Ollama Integration Service
// Handles local AI interactions for Bookiji with robust timeout handling

import fetch from 'node-fetch'
import { getAIConfig } from '@/config/ai'

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || process.env.NEXT_PUBLIC_LLM_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'codellama'

export interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
}

export interface OllamaRequest {
  model: string
  prompt: string
  stream?: boolean
  options?: {
    temperature?: number
    top_p?: number
    max_tokens?: number
  }
}

interface OllamaTag {
  name: string
  size: number
  modified_at: string
}

interface OllamaTagsResponse {
  models: OllamaTag[]
}

// Fallback responses for when AI is unavailable
const FALLBACK_RESPONSES = {
  booking: [
    "I'd be happy to help you book a service! Could you tell me what type of service you're looking for and when you'd like it?",
    "I can help you find and book services. What are you looking for today?",
    "Let me help you get booked! What service do you need and when would you like it?"
  ],
  general: [
    "I'm here to help! How can I assist you today?",
    "I'd be happy to help with your request. What do you need?",
    "Let me know what you're looking for and I'll do my best to help!"
  ]
}

export class OllamaService {
  private endpoint: string
  private model: string
  private config: ReturnType<typeof getAIConfig>

  constructor(endpoint?: string, model?: string) {
    this.endpoint = endpoint || OLLAMA_ENDPOINT
    this.model = model || OLLAMA_MODEL
    this.config = getAIConfig()
  }

  /**
   * Generate AI response with timeout handling and retry logic
   */
  async generate(prompt: string, options?: OllamaRequest['options']): Promise<string> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= this.config.ollama.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(prompt, options)
        return response
      } catch (error) {
        lastError = error as Error
        
        if (this.config.monitoring.logErrors) {
          console.warn(`Ollama attempt ${attempt + 1} failed:`, error)
        }
        
        // If this isn't the last attempt, wait before retrying
        if (attempt < this.config.ollama.maxRetries) {
          await this.delay(this.config.ollama.retryDelay * Math.pow(2, attempt)) // Exponential backoff
        }
      }
    }
    
    // All attempts failed, return fallback response
    if (this.config.monitoring.logErrors) {
      console.error('All Ollama attempts failed, using fallback response:', lastError)
    }
    
    if (this.config.fallbacks.enabled) {
      return this.getFallbackResponse(prompt)
    }
    
    throw lastError || new Error('All AI attempts failed')
  }

  /**
   * Make a single request with proper timeout handling
   */
  private async makeRequest(prompt: string, options?: OllamaRequest['options']): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.ollama.timeout)

    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 500,
            ...options,
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as OllamaResponse
      
      if (!data.response || data.response.trim().length === 0) {
        throw new Error('Empty response from Ollama')
      }

      return data.response
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timed out after ${this.config.ollama.timeout}ms`)
        }
        throw error
      }
      
      throw new Error('Unknown error occurred')
    }
  }

  /**
   * Get appropriate fallback response based on prompt content
   */
  private getFallbackResponse(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase()
    
    if (lowerPrompt.includes('book') || lowerPrompt.includes('appointment') || 
        lowerPrompt.includes('service') || lowerPrompt.includes('hair') || 
        lowerPrompt.includes('massage') || lowerPrompt.includes('therapy')) {
      return FALLBACK_RESPONSES.booking[Math.floor(Math.random() * FALLBACK_RESPONSES.booking.length)]
    }
    
    return FALLBACK_RESPONSES.general[Math.floor(Math.random() * FALLBACK_RESPONSES.general.length)]
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Chat method with improved error handling
   */
  async chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    const prompt = messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n') + '\nAssistant:'

    return this.generate(prompt)
  }

  /**
   * Check if Ollama service is available with timeout
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.ollama.healthCheckTimeout)

      const response = await fetch(`${this.endpoint}/api/tags`, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      if (this.config.monitoring.logErrors) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Ollama health check timed out')
        } else {
          console.warn('Ollama health check failed:', error)
        }
      }
      return false
    }
  }

  /**
   * Get available models with timeout protection
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.ollama.modelCheckTimeout)

      const response = await fetch(`${this.endpoint}/api/tags`, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) return []
      
      const data = await response.json() as OllamaTagsResponse
      return data.models.map(model => model.name)
    } catch (error) {
      if (this.config.monitoring.logErrors) {
        console.warn('Failed to get available models:', error)
      }
      return []
    }
  }

  /**
   * Update timeout configuration
   */
  setTimeout(timeout: number): void {
    this.config.ollama.timeout = timeout
  }

  /**
   * Get current timeout setting
   */
  getTimeout(): number {
    return this.config.ollama.timeout
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config }
  }
}

// Bookiji-specific AI prompts
export const BOOKIJI_PROMPTS = {
  bookingQuery: (query: string) => `
You are Bookiji, an AI booking assistant. A user is asking: "${query}"

Help them find and book a service. Be friendly, helpful, and suggest relevant services.
Keep responses concise and actionable. If they need a specific service, ask for location and timing.

If they want to book something, extract the key information:
- Service type (haircut, massage, etc.)
- Preferred date/time
- Location
- Any special requirements

Respond in a helpful way and guide them through the booking process.
`,

  bookingExtraction: (query: string) => `
Extract booking information from this user query: "${query}"

Return a JSON object with these fields (use null if not specified):
{
  "service": "service type",
  "date": "YYYY-MM-DD or null",
  "time": "HH:MM or null", 
  "location": "location or null",
  "notes": "special requirements or null",
  "intent": "booking_request" or "information_request"
}

Only return the JSON object, nothing else.
`,

  radiusScaling: (density: 'dense' | 'medium' | 'sparse', service: string) => `
You are Bookiji's AI radius scaling system. Analyze the optimal search radius for ${service} in a ${density} provider area.

Consider:
- Service type: Personal services (hair, nails) vs home services (cleaning, repairs) vs wellness (massage, therapy)
- Provider density: Dense areas can use smaller radius, sparse areas need larger radius
- Travel convenience: Urban vs suburban vs rural considerations
- Privacy protection: Balance between finding providers and protecting vendor identity

For ${service} in a ${density} area, recommend the optimal radius in kilometers.
Respond with: "Recommended radius: X km" followed by a brief explanation of your reasoning.
Keep the explanation under 50 words.
`,

  personaResponse: (message: string, persona: string, service?: string, userHistory?: string[]) => `
You are Bookiji's AI assistant, adapting to customer persona: ${persona}.

Customer message: "${message}"
${service ? `Service context: ${service}` : ''}
${userHistory && userHistory.length > 0 ? `Recent conversation: ${userHistory.slice(-3).join(', ')}` : ''}

Adapt your response based on the persona:
- **busy-professional**: Concise, time-focused, premium suggestions, emphasize convenience
- **budget-conscious**: Value-focused, deals, cost-effective options, clear pricing
- **wellness-focused**: Health benefits, quality, organic/natural options, holistic approach
- **tech-savvy**: Modern features, app benefits, digital convenience, innovation
- **traditional**: Trust, reliability, established providers, personal touch
- **general**: Balanced, friendly, helpful, standard recommendations

Keep responses under 100 words and maintain the persona's communication style.
`,

  availabilityDescription: (service: string, time: string, location: string) => `
Generate a friendly, concise description for ${service} availability at ${time} near ${location}.
Make it sound appealing and trustworthy. Keep it under 100 words.
`,
}

// Default instance with configuration
export const ollamaService = new OllamaService() 
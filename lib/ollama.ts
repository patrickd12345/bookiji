// 🧠 Ollama Integration Service
// Handles local AI interactions for Bookiji

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral'

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

export class OllamaService {
  private endpoint: string
  private model: string

  constructor(endpoint?: string, model?: string) {
    this.endpoint = endpoint || OLLAMA_ENDPOINT
    this.model = model || OLLAMA_MODEL
  }

  async generate(prompt: string, options?: OllamaRequest['options']): Promise<string> {
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
      })

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`)
      }

      const data: OllamaResponse = await response.json()
      return data.response
    } catch (error) {
      console.error('Ollama service error:', error)
      return 'I apologize, but I\'m having trouble connecting to my AI service right now. Please try again later.'
    }
  }

  async chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    const prompt = messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n') + '\nAssistant:'

    return this.generate(prompt)
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`)
      if (!response.ok) return []
      
      const data = await response.json()
      return data.models?.map((model: any) => model.name) || []
    } catch {
      return []
    }
  }
}

// Bookiji-specific AI prompts
export const BOOKIJI_PROMPTS = {
  bookingQuery: (query: string) => `
You are Bookiji, an AI booking assistant. A user is asking: "${query}"

Help them find and book a service. Be friendly, helpful, and suggest relevant services.
Keep responses concise and actionable. If they need a specific service, ask for location and timing.
`,

  radiusScaling: (density: 'dense' | 'medium' | 'sparse', service: string) => `
As Bookiji's AI, suggest an appropriate service radius for ${service} in a ${density} area.
Consider typical travel distances and provider availability.
Respond with just the radius in kilometers and a brief explanation.
`,

  availabilityDescription: (service: string, time: string, location: string) => `
Generate a friendly, concise description for ${service} availability at ${time} near ${location}.
Make it sound appealing and trustworthy. Keep it under 100 words.
`,
}

// Default instance
export const ollamaService = new OllamaService() 
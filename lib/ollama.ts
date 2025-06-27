// 🧠 Ollama Integration Service
// Handles local AI interactions for Bookiji

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'
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
      return data.models?.map((model: { name: string }) => model.name) || []
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

// Default instance
export const ollamaService = new OllamaService() 
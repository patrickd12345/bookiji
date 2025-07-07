import { getLLMConfig, isDevelopment } from '@/config/environment';

export interface LLMRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

interface OllamaMessage {
  content: string;
  [key: string]: unknown;
}

class LLMClient {
  private baseURL: string;
  private model: string;
  private timeout: number;

  constructor() {
    const llmConfig = getLLMConfig();
    this.baseURL = llmConfig.baseURL;
    this.model = llmConfig.model;
    this.timeout = llmConfig.timeout;
  }

  /**
   * Send a chat request to the LLM
   */
  async chat(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Validate the request
      if (!request.messages || request.messages.length === 0) {
        throw new Error('No messages provided');
      }

      // Use environment-specific endpoint
      const endpoint = this.getChatEndpoint();
      const payload = this.buildPayload(request);

      console.log(`🤖 LLM Request to: ${endpoint}`);
      console.log(`📝 Model: ${this.model}`);
      console.log(`🌍 Environment: ${isDevelopment() ? 'Development' : 'Production'}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`LLM request failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return this.formatResponse(data);
    } catch (error) {
      console.error('❌ LLM request failed:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate chat endpoint based on environment
   */
  private getChatEndpoint(): string {
    if (isDevelopment()) {
      // Local Ollama endpoint
      return `${this.baseURL}/api/chat`;
    } else {
      // Railway production endpoint (OpenAI-compatible)
      return `${this.baseURL}/v1/chat/completions`;
    }
  }

  /**
   * Build the payload based on the LLM provider
   */
  private buildPayload(request: LLMRequest) {
    if (isDevelopment()) {
      // Ollama format
      return {
        model: request.model || this.model,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.max_tokens || 1000,
        },
      };
    } else {
      // OpenAI-compatible format (for Railway deployment)
      return {
        model: request.model || this.model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.max_tokens || 1000,
        stream: false,
      };
    }
  }

  /**
   * Format the response to a consistent structure
   */
  private formatResponse(data: Record<string, unknown>): LLMResponse {
    if (isDevelopment()) {
      // Ollama response format
      return {
        id: `ollama-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: this.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: (data.message as OllamaMessage)?.content || (data.response as string) || '',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: typeof data.prompt_eval_count === 'number' ? data.prompt_eval_count : 0,
          completion_tokens: typeof data.eval_count === 'number' ? data.eval_count : 0,
          total_tokens: (typeof data.prompt_eval_count === 'number' ? data.prompt_eval_count : 0) + (typeof data.eval_count === 'number' ? data.eval_count : 0),
        },
      };
    } else {
      // OpenAI-compatible response format
      return data as unknown as LLMResponse;
    }
  }

  /**
   * Generate a simple text response (for backward compatibility)
   */
  async generateText(prompt: string): Promise<string> {
    const response = await this.chat({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Health check for the LLM service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const endpoint = isDevelopment() 
        ? `${this.baseURL}/api/tags` 
        : `${this.baseURL}/v1/models`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      console.error('❌ LLM health check failed:', error);
      return false;
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      if (isDevelopment()) {
        // Ollama models
        const response = await fetch(`${this.baseURL}/api/tags`);
        const data = await response.json();
        return data.models?.map((model: { name: string }) => model.name) || [];
      } else {
        // OpenAI-compatible models
        const response = await fetch(`${this.baseURL}/v1/models`);
        const data = await response.json();
        return data.data?.map((model: { id: string }) => model.id) || [];
      }
    } catch (error) {
      console.error('❌ Failed to get available models:', error);
      return [];
    }
  }
}

// Create and export a singleton instance
export const llmClient = new LLMClient();

// Export the class for testing
export { LLMClient };

// Helper function for common Bookiji AI tasks
export const bookijiAI = {
  /**
   * Generate booking-related responses
   */
  async generateBookingResponse(userInput: string): Promise<string> {
    const systemPrompt = `You are Bookiji's AI booking assistant. Help users find and book services. Be helpful, concise, and encourage them to use the booking system.`;
    
    const response = await llmClient.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || 'I can help you find available services. What are you looking for?';
  },

  /**
   * Generate availability descriptions
   */
  async generateAvailabilityDescription(serviceType: string, location: string, timeSlot: string): Promise<string> {
    const prompt = `Generate a friendly, concise description for a ${serviceType} service available in ${location} at ${timeSlot}. Make it sound appealing and professional.`;
    
    const response = await llmClient.chat({
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    return response.choices[0]?.message?.content || `${serviceType} available at ${timeSlot}`;
  },

  /**
   * Analyze service category from user input
   */
  async categorizeService(userInput: string): Promise<string> {
    const prompt = `Categorize this service request into one of these categories: beauty, wellness, fitness, home, education, professional, entertainment, other. User input: "${userInput}"`;
    
    const response = await llmClient.chat({
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    return response.choices[0]?.message?.content?.toLowerCase().trim() || 'other';
  },
}; 
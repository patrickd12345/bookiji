import { getLLMConfig, isDevelopment } from '@/config/environment';
import { logger } from '@/lib/logger';
import { getAiGatewayAuth } from '@/config/aiGatewayAuth';

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
  private static hasLoggedMode = false;

  constructor() {
    const llmConfig = getLLMConfig();
    const auth = getAiGatewayAuth();
    
    // If Vercel Gateway auth is available, always use Vercel Gateway URL
    if (auth) {
      this.baseURL = process.env.VERCEL_AI_BASE_URL || 'https://ai-gateway.vercel.sh';
    } else {
      this.baseURL = llmConfig.baseURL;
    }
    
    this.model = llmConfig.model;
    this.timeout = llmConfig.timeout;

    if (!LLMClient.hasLoggedMode) {
      logger.info(`🔐 Auth mode: ${auth ? 'vercel-gateway' : 'ollama'}`);
      logger.info(`🌐 Base URL: ${this.baseURL}`);
      LLMClient.hasLoggedMode = true;
    }
  }

  /**
   * Check if we should use Vercel/OpenAI-compatible format
   * We use this if an authentication method is available
   */
  private isVercelMode(): boolean {
    return getAiGatewayAuth() !== null;
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

      // Use provider-specific endpoint
      const endpoint = this.getChatEndpoint();
      const payload = this.buildPayload(request);

      logger.info(`🤖 LLM Request to: ${endpoint}`);
      logger.info(`📝 Model: ${request.model || this.model}`);
      logger.info(`🌍 Environment: ${isDevelopment() ? 'Development' : 'Production'}`);
      logger.info(`🛠️  Mode: ${this.isVercelMode() ? 'Vercel/OpenAI' : 'Ollama'}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const auth = getAiGatewayAuth();
      if (this.isVercelMode() && auth) {
        Object.assign(headers, auth);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`LLM request failed: ${response.status} ${response.statusText} - ${errorData.error?.message || errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return this.formatResponse(data);
    } catch (error) {
      console.error('❌ LLM request failed:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate chat endpoint based on provider
   */
  private getChatEndpoint(): string {
    if (this.isVercelMode()) {
      // Vercel AI Gateway endpoint (OpenAI-compatible)
      return `${this.baseURL.replace(/\/$/, '')}/v1/chat/completions`;
    } else {
      // Local Ollama endpoint
      return `${this.baseURL}/api/chat`;
    }
  }

  /**
   * Build the payload based on the LLM provider
   */
  private buildPayload(request: LLMRequest) {
    if (this.isVercelMode()) {
      // Vercel / OpenAI-compatible format
      return {
        model: request.model || this.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 1000,
        stream: false,
      };
    } else {
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
    }
  }

  /**
   * Format the response to a consistent structure
   */
  private formatResponse(data: Record<string, unknown>): LLMResponse {
    if (this.isVercelMode()) {
      // Vercel / OpenAI-compatible response format
      if (data.choices && Array.isArray(data.choices)) {
        return data as unknown as LLMResponse;
      }

      // Defensive parsing for non-standard formats if any
      const content = 
        (data.output as any)?.[0]?.content || 
        (data.output as any)?.[0]?.text || 
        (data as any).text || 
        '';

      return {
        id: (data.id as string) || `vercel-${Date.now()}`,
        object: 'chat.completion',
        created: (data.created as number) || Math.floor(Date.now() / 1000),
        model: (data.model as string) || this.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content,
            },
            finish_reason: 'stop',
          },
        ],
        usage: (data.usage as any) || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    } else {
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
      if (this.isVercelMode()) {
        // For Vercel gateway, we do a lightweight generate call
        const response = await this.chat({
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        });
        return !!response.choices[0]?.message?.content;
      } else {
        const response = await fetch(`${this.baseURL}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      }
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
      if (this.isVercelMode()) {
        // For Vercel, we return a safe default or env-provided list
        return [this.model];
      } else {
        // Ollama models
        const response = await fetch(`${this.baseURL}/api/tags`);
        const data = await response.json();
        return data.models?.map((model: { name: string }) => model.name) || [];
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

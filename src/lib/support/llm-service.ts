/**
 * LLM Provider Abstraction
 * Now uses Vercel AI Gateway for all LLM operations (unified with rest of codebase)
 * Falls back to direct API calls only if Vercel AI Gateway is not configured
 * 
 * Note: Embeddings use OpenAI-compatible API (via Vercel Gateway or direct OpenAI)
 * Generation uses Vercel AI Gateway (OpenAI-compatible) or falls back to direct providers
 */

import { llmClient } from '@/lib/llm-client';
import { getAiGatewayAuth } from '@/config/aiGatewayAuth';
import { getLLMConfig } from '@/config/environment';

export type LLMProvider = 'vercel-gateway' | 'openai' | 'gemini' | 'groq' | 'deepseek';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string; // Optional when using Vercel Gateway
  model?: string;
}

class LLMService {
  private config: LLMConfig;
  private useVercelGateway: boolean;

  constructor(config: LLMConfig) {
    this.config = config;
    // Use Vercel Gateway if:
    // 1. Provider is explicitly 'vercel-gateway', OR
    // 2. Provider is not set and Vercel Gateway auth is available
    const hasVercelAuth = getAiGatewayAuth() !== null;
    this.useVercelGateway = config.provider === 'vercel-gateway' || 
                            (!config.provider && hasVercelAuth);
  }

  async getEmbedding(text: string): Promise<number[]> {
    // Try Vercel AI Gateway first (OpenAI-compatible embeddings endpoint)
    if (this.useVercelGateway) {
      try {
        const llmConfig = getLLMConfig();
        const auth = getAiGatewayAuth();
        
        // Ensure we're using Vercel Gateway URL, not Ollama
        const baseURL = llmConfig.baseURL.includes('ai-gateway.vercel.sh') 
          ? llmConfig.baseURL 
          : 'https://ai-gateway.vercel.sh';
        const endpoint = `${baseURL.replace(/\/$/, '')}/v1/embeddings`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(auth || {}),
          },
          body: JSON.stringify({
            model: this.config.model || 'text-embedding-3-small',
            input: text.replace(/\n/g, ' '),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data[0] && data.data[0].embedding) {
            console.warn('✅ Embedding generated via Vercel AI Gateway');
            return data.data[0].embedding;
          }
        }
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn('⚠️ Vercel AI Gateway embedding failed, falling back to direct provider:', errorText);
      } catch (error) {
        console.warn('⚠️ Vercel AI Gateway embedding error, falling back:', error);
      }
    }

    // Fallback to direct provider APIs
    if (this.config.provider === 'openai' || this.useVercelGateway) {
      const { default: OpenAI } = await import('openai');
      const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required for embeddings');
      }
      const client = new OpenAI({ apiKey });
      const response = await client.embeddings.create({
        model: this.config.model || 'text-embedding-3-small',
        input: text.replace(/\n/g, ' '),
      });
      return response.data[0].embedding; // 1536 dimensions
    } else {
      // Gemini embeddings - Note: returns 768 dimensions
      // Database schema uses 1536 (OpenAI), so Gemini embeddings will be padded/truncated
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const apiKey = this.config.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY is required for Gemini embeddings');
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await model.embedContent(text);
        const embedding = result.embedding.values;
        
        // Pad to 1536 dimensions to match database schema
        if (embedding.length < 1536) {
          return [...embedding, ...Array(1536 - embedding.length).fill(0)];
        } else if (embedding.length > 1536) {
          return embedding.slice(0, 1536);
        }
        return embedding;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // If Gemini API key is leaked/invalid, try fallback to OpenAI if available
        if (errorMessage.includes('leaked') || errorMessage.includes('403') || errorMessage.includes('Invalid API key')) {
          console.warn('⚠️ Gemini API key issue detected, attempting OpenAI fallback...');
          const openaiKey = process.env.OPENAI_API_KEY;
          if (openaiKey) {
            const { default: OpenAI } = await import('openai');
            const client = new OpenAI({ apiKey: openaiKey });
            const response = await client.embeddings.create({
              model: 'text-embedding-3-small',
              input: text.replace(/\n/g, ' '),
            });
            console.warn('✅ Fallback to OpenAI embeddings successful');
            return response.data[0].embedding;
          }
        }
        throw error;
      }
    }
  }

  async generateAnswer(systemPrompt: string, userQuestion: string): Promise<string> {
    // Use Vercel AI Gateway if configured (unified with rest of codebase)
    if (this.useVercelGateway) {
      try {
        // Get model from config or use Vercel Gateway default
        // Vercel Gateway uses OpenAI-compatible models (gpt-4o-mini, etc.)
        const llmConfig = getLLMConfig();
        const optimization = llmConfig.optimization || 'cost';
        
        // Select model based on optimization preference
        let model: string;
        if (this.config.model) {
          model = this.config.model; // Use configured model
        } else if (process.env.VERCEL_AI_MODEL) {
          model = process.env.VERCEL_AI_MODEL; // User explicitly set a model
        } else if (optimization === 'cost') {
          model = 'gpt-3.5-turbo'; // Cheapest option
        } else if (optimization === 'speed') {
          model = 'gpt-4o-mini'; // Fast and reasonably priced
        } else {
          model = 'gpt-4o-mini'; // Balanced (default)
        }
        
        const response = await llmClient.chat({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuestion }
          ],
          model: model,
          temperature: 0.3,
          max_tokens: 1000,
        });
        console.warn('✅ LLM answer generated via Vercel AI Gateway');
        return response.choices[0]?.message?.content || '';
      } catch (error) {
        console.warn('⚠️ Vercel AI Gateway generation failed, falling back to direct provider:', error);
        // Fall through to direct provider fallback
      }
    }

    // Fallback to direct provider APIs (only if Vercel Gateway not available or failed)
    if (this.config.provider === 'openai' || this.useVercelGateway) {
      const { default: OpenAI } = await import('openai');
      const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required for OpenAI provider');
      }
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuestion }
        ],
        temperature: 0.3,
      });
      return completion.choices[0].message.content || '';
    } else if (this.config.provider === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const apiKey = this.config.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is required for Gemini provider');
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: this.config.model || 'gemini-1.5-flash',
        systemInstruction: systemPrompt
      });
      const result = await model.generateContent(userQuestion);
      return result.response.text();
    } else if (this.config.provider === 'groq') {
      // Groq - Free tier, extremely fast inference
      try {
        const Groq = (await import('groq-sdk')).default;
        const apiKey = this.config.apiKey || process.env.GROQ_API_KEY;
        if (!apiKey) {
          throw new Error('GROQ_API_KEY is required for Groq provider');
        }
        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create({
          model: this.config.model || 'llama-3.1-8b-instant', // Fast, free tier
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuestion }
          ],
          temperature: 0.3,
        });
        return completion.choices[0]?.message?.content || '';
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // If Groq API key is invalid, try fallback to Vercel Gateway or other providers
        if (errorMessage.includes('Invalid API Key') || errorMessage.includes('401') || errorMessage.includes('invalid_api_key')) {
          console.warn('⚠️ Groq API key invalid, attempting fallback...');
          
          // Try Vercel Gateway first (if available)
          if (getAiGatewayAuth()) {
            try {
              const response = await llmClient.chat({
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userQuestion }
                ],
                temperature: 0.3,
                max_tokens: 1000,
              });
              console.warn('✅ Fallback to Vercel AI Gateway successful');
              return response.choices[0]?.message?.content || '';
            } catch (gatewayError) {
              console.warn('⚠️ Vercel Gateway fallback also failed');
            }
          }
          
          // Try Gemini as fallback
          const geminiKey = process.env.GEMINI_API_KEY;
          if (geminiKey) {
            try {
              const { GoogleGenerativeAI } = await import('@google/generative-ai');
              const genAI = new GoogleGenerativeAI(geminiKey);
              const model = genAI.getGenerativeModel({ 
                model: 'gemini-1.5-flash',
                systemInstruction: systemPrompt
              });
              const result = await model.generateContent(userQuestion);
              console.warn('✅ Fallback to Gemini generation successful');
              return result.response.text();
            } catch (geminiError) {
              console.warn('⚠️ Gemini fallback also failed');
            }
          }
          
          // Try OpenAI as last resort
          const openaiKey = process.env.OPENAI_API_KEY;
          if (openaiKey) {
            const { default: OpenAI } = await import('openai');
            const client = new OpenAI({ apiKey: openaiKey });
            const completion = await client.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userQuestion }
              ],
              temperature: 0.3,
            });
            console.warn('✅ Fallback to OpenAI generation successful');
            return completion.choices[0].message.content || '';
          }
        }
        throw error;
      }
    } else if (this.config.provider === 'deepseek') {
      // DeepSeek - Low cost, OpenAI-compatible API
      const { default: OpenAI } = await import('openai');
      const apiKey = this.config.apiKey || process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY is required for DeepSeek provider');
      }
      const client = new OpenAI({ 
        apiKey,
        baseURL: 'https://api.deepseek.com/v1'
      });
      const completion = await client.chat.completions.create({
        model: this.config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuestion }
        ],
        temperature: 0.3,
      });
      return completion.choices[0].message.content || '';
    }
    
    throw new Error(`Unsupported provider: ${this.config.provider}`);
  }
}

/**
 * Get LLM service based on environment configuration
 * 
 * Now prioritizes Vercel AI Gateway (unified with rest of codebase)
 * Falls back to direct providers only if Vercel Gateway is not configured
 * 
 * Embeddings: Use Vercel Gateway (OpenAI-compatible) or direct OpenAI/Gemini
 * Generation: Use Vercel Gateway (preferred) or direct providers (openai, gemini, groq, deepseek)
 */
export function getLLMService(): LLMService {
  // Check if Vercel AI Gateway is available (preferred)
  const hasVercelGateway = getAiGatewayAuth() !== null;
  
  if (hasVercelGateway) {
    // Get model based on optimization preference (cost-optimized by default)
    const llmConfig = getLLMConfig();
    const optimization = llmConfig.optimization || 'cost';
    
    // Select model based on optimization preference
    let model: string;
    if (process.env.VERCEL_AI_MODEL) {
      model = process.env.VERCEL_AI_MODEL; // User explicitly set a model
    } else if (optimization === 'cost') {
      model = 'gpt-3.5-turbo'; // Cheapest option
    } else if (optimization === 'speed') {
      model = 'gpt-4o-mini'; // Fast and reasonably priced
    } else {
      model = 'gpt-4o-mini'; // Balanced (default)
    }
    
    return new LLMService({ 
      provider: 'vercel-gateway',
      model: model,
    });
  }

  // Fallback to direct provider configuration
  const provider = (process.env.SUPPORT_LLM_PROVIDER || 'gemini').toLowerCase() as LLMProvider;
  
  let apiKey: string | undefined;
  let model: string | undefined;

  if (provider === 'gemini') {
    apiKey = process.env.GEMINI_API_KEY;
    model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required when using Gemini provider (or configure Vercel AI Gateway)');
    }
  } else if (provider === 'groq') {
    apiKey = process.env.GROQ_API_KEY;
    model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is required when using Groq provider (or configure Vercel AI Gateway)');
    }
  } else if (provider === 'deepseek') {
    apiKey = process.env.DEEPSEEK_API_KEY;
    model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required when using DeepSeek provider (or configure Vercel AI Gateway)');
    }
  } else {
    // Default to OpenAI
    apiKey = process.env.OPENAI_API_KEY;
    model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required when using OpenAI provider (or configure Vercel AI Gateway)');
    }
  }

  return new LLMService({ provider, apiKey, model });
}

/**
 * Get embedding service (separate from generation)
 * Now prioritizes Vercel AI Gateway (OpenAI-compatible embeddings)
 * Falls back to direct OpenAI or Gemini if Vercel Gateway is not configured
 */
export function getEmbeddingService(): LLMService {
  // Check if Vercel AI Gateway is available (preferred - unified with rest of codebase)
  const hasVercelGateway = getAiGatewayAuth() !== null;
  
  if (hasVercelGateway) {
    const llmConfig = getLLMConfig();
    return new LLMService({ 
      provider: 'vercel-gateway',
      model: 'text-embedding-3-small', // OpenAI-compatible via Vercel Gateway
    });
  }

  // Fallback to direct provider configuration
  // Check for provider, with fallback: prefer Gemini (free tier) if key is available
  let embeddingProvider = (process.env.SUPPORT_EMBEDDING_PROVIDER || '').toLowerCase().trim();
  
  // Smart fallback: if no provider specified, prefer Gemini (free tier) if key is available
  if (!embeddingProvider) {
    if (process.env.GEMINI_API_KEY) {
      embeddingProvider = 'gemini';
    } else if (process.env.OPENAI_API_KEY) {
      embeddingProvider = 'openai';
    } else {
      // Default to Gemini (free tier) but will error if no key
      embeddingProvider = 'gemini';
    }
  }
  
  // Validate provider is one of the supported options
  if (embeddingProvider !== 'gemini' && embeddingProvider !== 'openai') {
    embeddingProvider = 'gemini'; // Default to Gemini (free tier)
  }
  
  let apiKey: string | undefined;
  let model: string | undefined;

  if (embeddingProvider === 'gemini') {
    apiKey = process.env.GEMINI_API_KEY;
    model = 'text-embedding-004'; // Fixed for Gemini
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for Gemini embeddings (or configure Vercel AI Gateway)');
    }
  } else {
    apiKey = process.env.OPENAI_API_KEY;
    model = 'text-embedding-3-small'; // Fixed for OpenAI
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI embeddings (or configure Vercel AI Gateway)');
    }
  }

  return new LLMService({ provider: embeddingProvider as 'openai' | 'gemini', apiKey, model });
}


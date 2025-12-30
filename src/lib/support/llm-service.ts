/**
 * LLM Provider Abstraction
 * Supports multiple providers for RAG generation:
 * - OpenAI (GPT-4o-mini) - Reliable, widely used
 * - Gemini 1.5 Flash - Free tier, very cheap (default)
 * - Groq - Free tier, extremely fast inference
 * - DeepSeek - Low cost alternative
 * 
 * Note: Embeddings use OpenAI or Gemini (they have embedding APIs)
 * Defaults to Gemini (free tier) for both generation and embeddings
 * Generation can use any of the above providers
 */

export type LLMProvider = 'openai' | 'gemini' | 'groq' | 'deepseek';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
}

class LLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async getEmbedding(text: string): Promise<number[]> {
    if (this.config.provider === 'openai') {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: this.config.apiKey });
      const response = await client.embeddings.create({
        model: this.config.model || 'text-embedding-3-small',
        input: text.replace(/\n/g, ' '),
      });
      return response.data[0].embedding; // 1536 dimensions
    } else {
      // Gemini embeddings - Note: returns 768 dimensions
      // Database schema uses 1536 (OpenAI), so Gemini embeddings will be padded/truncated
      // For production, consider separate embedding dimension or re-embedding when switching
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.config.apiKey);
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      const embedding = result.embedding.values;
      
      // Pad to 1536 dimensions to match database schema (or truncate if larger)
      // This is a workaround - ideally use separate tables per provider
      if (embedding.length < 1536) {
        return [...embedding, ...Array(1536 - embedding.length).fill(0)];
      } else if (embedding.length > 1536) {
        return embedding.slice(0, 1536);
      }
      return embedding;
    }
  }

  async generateAnswer(systemPrompt: string, userQuestion: string): Promise<string> {
    if (this.config.provider === 'openai') {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: this.config.apiKey });
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
      const genAI = new GoogleGenerativeAI(this.config.apiKey);
      const model = genAI.getGenerativeModel({ 
        model: this.config.model || 'gemini-1.5-flash',
        systemInstruction: systemPrompt
      });
      const result = await model.generateContent(userQuestion);
      return result.response.text();
    } else if (this.config.provider === 'groq') {
      // Groq - Free tier, extremely fast inference
      const Groq = (await import('groq-sdk')).default;
      const groq = new Groq({ apiKey: this.config.apiKey });
      const completion = await groq.chat.completions.create({
        model: this.config.model || 'llama-3.1-8b-instant', // Fast, free tier
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuestion }
        ],
        temperature: 0.3,
      });
      return completion.choices[0]?.message?.content || '';
    } else if (this.config.provider === 'deepseek') {
      // DeepSeek - Low cost, OpenAI-compatible API
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ 
        apiKey: this.config.apiKey,
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
 * Embeddings: Use OpenAI or Gemini (they have embedding APIs)
 * Generation: Can use any provider (openai, gemini, groq, deepseek)
 */
export function getLLMService(): LLMService {
  const provider = (process.env.SUPPORT_LLM_PROVIDER || 'gemini').toLowerCase() as LLMProvider;
  
  let apiKey: string;
  let model: string | undefined;

  if (provider === 'gemini') {
    apiKey = process.env.GEMINI_API_KEY || '';
    model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required when using Gemini provider');
    }
  } else if (provider === 'groq') {
    apiKey = process.env.GROQ_API_KEY || '';
    model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is required when using Groq provider');
    }
  } else if (provider === 'deepseek') {
    apiKey = process.env.DEEPSEEK_API_KEY || '';
    model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required when using DeepSeek provider');
    }
  } else {
    // Default to OpenAI
    apiKey = process.env.OPENAI_API_KEY || '';
    model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required when using OpenAI provider');
    }
  }

  return new LLMService({ provider, apiKey, model });
}

/**
 * Get embedding service (separate from generation)
 * Only OpenAI and Gemini have embedding APIs
 */
export function getEmbeddingService(): LLMService {
  // Check for provider, with fallback: prefer Gemini (free tier) if key is available
  let embeddingProvider = (process.env.SUPPORT_EMBEDDING_PROVIDER || '').toLowerCase().trim();
  
  // Smart fallback: if no provider specified, prefer Gemini (free tier) if key is available
  if (!embeddingProvider) {
    if (process.env.GEMINI_API_KEY) {
      embeddingProvider = 'gemini';
      // Using Gemini (free tier) for embeddings when GEMINI_API_KEY is available
    } else if (process.env.OPENAI_API_KEY) {
      embeddingProvider = 'openai';
      // Using OpenAI for embeddings (GEMINI_API_KEY not found)
    } else {
      // Default to Gemini (free tier) but will error if no key
      embeddingProvider = 'gemini';
    }
  }
  
  // Validate provider is one of the supported options
  if (embeddingProvider !== 'gemini' && embeddingProvider !== 'openai') {
    embeddingProvider = 'gemini'; // Default to Gemini (free tier)
  }
  
  let apiKey: string;
  let model: string | undefined;

  if (embeddingProvider === 'gemini') {
    apiKey = process.env.GEMINI_API_KEY || '';
    model = 'text-embedding-004'; // Fixed for Gemini
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for Gemini embeddings');
    }
  } else {
    apiKey = process.env.OPENAI_API_KEY || '';
    model = 'text-embedding-3-small'; // Fixed for OpenAI
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI embeddings');
    }
  }

  return new LLMService({ provider: embeddingProvider as 'openai' | 'gemini', apiKey, model });
}


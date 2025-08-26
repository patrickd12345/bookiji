import { createClient } from '@supabase/supabase-js';
import { KBProvider, KBArticle, KBSearchResult, Locale, Section } from './types';

// This will be the production provider using pgvector
export class PgVectorProvider implements KBProvider {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async getArticle(id: string, locale: Locale): Promise<KBArticle | null> {
    const { data, error } = await this.supabase
      .from('kb_articles')
      .select('*')
      .eq('id', id)
      .eq('locale', locale)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      locale: data.locale,
      section: data.section,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      url: data.url
    };
  }

  async search(
    query: string, 
    locale: Locale, 
    sectionBias?: Section, 
    limit: number = 10
  ): Promise<KBSearchResult[]> {
    try {
      // First, get the query embedding
      const { data: embeddingData, error: embeddingError } = await this.supabase.rpc(
        'get_query_embedding',
        { query_text: query }
      );

      if (embeddingError || !embeddingData) {
        throw new Error('Failed to generate query embedding');
      }

      // Execute vector similarity search with chunking support
      const { data, error } = await this.supabase.rpc(
        'kb_search',
        {
          q_embedding: embeddingData,
          k: limit,
          in_locale: locale,
          in_section: sectionBias || null
        }
      );

      if (error) {
        // If the search fails (e.g., no chunks/embeddings yet), fall back to simple text search
        console.warn('Vector search failed, falling back to text search:', error.message);
        return await this.fallbackTextSearch(query, locale, sectionBias, limit);
      }

      return (data || []).map((item: any) => ({
        id: item.article_id,
        title: item.title,
        snippet: item.snippet,
        score: item.score || 0,
        url: item.url
      }));
    } catch (error) {
      console.warn('Search error, falling back to text search:', error);
      return await this.fallbackTextSearch(query, locale, sectionBias, limit);
    }
  }

  private async fallbackTextSearch(
    query: string, 
    locale: Locale, 
    sectionBias?: Section, 
    limit: number = 10
  ): Promise<KBSearchResult[]> {
    let queryBuilder = this.supabase
      .from('kb_articles')
      .select('id, title, content, section, url')
      .eq('locale', locale)
      .ilike('title', `%${query}%`)
      .limit(limit);

    if (sectionBias) {
      queryBuilder = queryBuilder.eq('section', sectionBias);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Fallback search failed:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      snippet: item.content?.substring(0, 240) || '',
      score: 0.5, // Default score for text search
      url: item.url
    }));
  }

  async answer(
    query: string,
    locale: Locale,
    sectionBias?: Section
  ): Promise<{ text: string; sources: KBSearchResult[] }> {
    // Get relevant search results
    const searchResults = await this.search(query, locale, sectionBias, 5);
    
    if (searchResults.length === 0) {
      return {
        text: 'No relevant content found in the knowledge base.',
        sources: []
      };
    }

    // For now, synthesize a simple answer from the top result
    // In production, you'd send this to an LLM for proper synthesis
    const topResult = searchResults[0];
    const answer = this.synthesizeAnswer(query, topResult, searchResults);

    return {
      text: answer,
      sources: searchResults
    };
  }

  private generateSnippet(content: string, query: string, maxLength: number = 200): string {
    // Simple snippet generation - in production, use proper text extraction
    const words = query.toLowerCase().split(' ');
    const contentLower = content.toLowerCase();
    
    // Find the best matching position
    let bestPos = 0;
    let bestScore = 0;
    
    for (let i = 0; i < contentLower.length - 50; i++) {
      let score = 0;
      for (const word of words) {
        if (contentLower.includes(word, i)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestPos = i;
      }
    }

    // Extract snippet around the best position
    const start = Math.max(0, bestPos - 50);
    const end = Math.min(content.length, start + maxLength);
    let snippet = content.slice(start, end);
    
    // Clean up snippet boundaries
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return snippet;
  }

  private synthesizeAnswer(query: string, topResult: KBSearchResult, allResults: KBSearchResult[]): string {
    // Simple answer synthesis - in production, use LLM
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('hold') || queryLower.includes('charge')) {
      return 'We place a temporary $1 authorization to verify your payment method. It is not a charge and disappears automatically within 1-3 business days.';
    }
    
    if (queryLower.includes('payout') || queryLower.includes('payment')) {
      return 'Vendors receive payouts on a weekly schedule after bookings are confirmed and completed. Payments are typically processed every Tuesday.';
    }
    
    if (queryLower.includes('cancel') || queryLower.includes('refund')) {
      return 'Bookings can be cancelled up to 24 hours before the scheduled time for a full refund. Cancellations within 24 hours may incur a cancellation fee.';
    }
    
    // Default to top result snippet
    return topResult.snippet;
  }
}

// Factory function for easy instantiation
export function createPgVectorProvider(): PgVectorProvider {
  return new PgVectorProvider();
}

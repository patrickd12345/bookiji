import { KBProvider, KBArticle, KBSearchResult, Locale, Section } from './types';

const ARTICLES: KBArticle[] = [
  {
    id: 'faq-holds-001',
    title: 'About the $1 Hold',
    content: 'We place a temporary $1 authorization to verify your payment method. It is not a charge and disappears automatically within 1-3 business days. This is a standard practice to ensure your card is valid and has sufficient funds.',
    locale: 'en',
    section: 'faq',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    url: 'https://bookiji.com/faq#holds'
  },
  {
    id: 'vendor-payouts-001',
    title: 'Vendor Payouts',
    content: 'Payouts are initiated after bookings are confirmed and completed. We process payments on a weekly schedule, typically every Tuesday. Vendors can set their preferred payout method in their dashboard settings.',
    locale: 'en',
    section: 'vendor',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    url: 'https://bookiji.com/vendors#payouts'
  },
  {
    id: 'cancellation-policy-001',
    title: 'Cancellation Policy',
    content: 'Bookings can be cancelled up to 24 hours before the scheduled time for a full refund. Cancellations within 24 hours may incur a cancellation fee. No-shows are charged the full booking amount.',
    locale: 'en',
    section: 'policy',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    url: 'https://bookiji.com/policy#cancellation'
  },
  {
    id: 'payment-issues-001',
    title: 'Payment Issues',
    content: 'If you experience payment issues, please check that your card has sufficient funds and is not expired. We accept Visa, Mastercard, American Express, and Discover. Contact support if problems persist.',
    locale: 'en',
    section: 'troubleshooting',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    url: 'https://bookiji.com/help#payment'
  }
];

export const MockKbProvider: KBProvider = {
  async getArticle(id: string, locale: Locale): Promise<KBArticle | null> {
    const article = ARTICLES.find(a => a.id === id && a.locale === locale);
    return article || null;
  },

  async search(query: string, locale: Locale, sectionBias?: Section, limit: number = 10): Promise<KBSearchResult[]> {
    const queryLower = query.toLowerCase();
    
    return ARTICLES
      .filter(article => {
        const matchesQuery = article.title.toLowerCase().includes(queryLower) || 
                           article.content.toLowerCase().includes(queryLower);
        const matchesLocale = article.locale === locale;
        const matchesSection = !sectionBias || article.section === sectionBias;
        return matchesQuery && matchesLocale && matchesSection;
      })
      .map(article => ({
        id: article.id,
        title: article.title,
        snippet: article.content.substring(0, 200) + '...',
        score: 0.9,
        url: article.url
      }))
      .slice(0, limit);
  },

  async answer(query: string, locale: Locale, sectionBias?: Section): Promise<{ text: string; sources: KBSearchResult[] }> {
    const searchResults = await this.search(query, locale, sectionBias, 5);
    
    if (searchResults.length === 0) {
      return {
        text: 'No relevant content found in the knowledge base.',
        sources: []
      };
    }

    const topResult = searchResults[0];
    let answer = '';
    
    if (topResult.title.includes('Hold')) {
      answer = 'We place a temporary $1 authorization to verify your payment method. It is not a charge and disappears automatically within 1-3 business days.';
    } else if (topResult.title.includes('Payout')) {
      answer = 'Vendors receive payouts on a weekly schedule after bookings are confirmed and completed. Payments are typically processed every Tuesday.';
    } else if (topResult.title.includes('Cancellation')) {
      answer = 'Bookings can be cancelled up to 24 hours before the scheduled time for a full refund. Cancellations within 24 hours may incur a cancellation fee.';
    } else if (topResult.title.includes('Payment')) {
      answer = 'We accept Visa, Mastercard, American Express, and Discover. If you experience issues, check your card has sufficient funds and is not expired.';
    } else {
      answer = topResult.snippet;
    }

    return {
      text: answer,
      sources: searchResults
    };
  }
};

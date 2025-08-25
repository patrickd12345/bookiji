export type Locale = 'en' | 'fr';
export type Section = 'faq' | 'vendor' | 'policy' | 'troubleshooting';

// Core data structures
export interface KBArticle {
  id: string;
  title: string;
  content: string;
  locale: Locale;
  section: Section;
  createdAt: Date;
  updatedAt: Date;
  url?: string; // Optional for backward compatibility
}

export interface KBSearchResult {
  id: string;
  title: string;
  snippet: string; // short preview of the content
  score: number;   // semantic similarity score
  url?: string;    // Optional for backward compatibility
}

// Legacy interfaces for backward compatibility
export interface KbSearchParams {
  q: string;
  locale?: Locale;
  section?: Section;
  limit?: number;
}

export interface KbSearchItem {
  id: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
}

export interface KbSearchResult {
  results: KbSearchItem[];
}

export interface KbAnswerParams {
  query: string;
  locale?: Locale;
  actor?: 'user' | 'vendor';
  section?: Section;
  maxTokens?: number;
}

export interface KbCitation {
  id: string;
  title: string;
  url: string;
  excerpt: string;
}

export interface KbAnswerResult {
  answer: string;            // plain text or safe HTML
  citations: KbCitation[];
  followups?: string[];
}

// Future-proof provider interface
export interface KBProvider {
  getArticle(id: string, locale: Locale): Promise<KBArticle | null>;
  
  search(query: string, locale: Locale, sectionBias?: Section, limit?: number): Promise<KBSearchResult[]>;
  
  answer(
    query: string,
    locale: Locale,
    sectionBias?: Section
  ): Promise<{ text: string; sources: KBSearchResult[] }>;
}

// Legacy provider interface for backward compatibility
export interface KbProvider {
  search(params: KbSearchParams): Promise<KbSearchResult>;
  answer(params: KbAnswerParams): Promise<KbAnswerResult>;
  article(id: string): Promise<{ id: string; title: string; url: string; content: string }>;
}

// Feedback & Learning Types
export interface KBFeedbackIn {
  sessionId?: string;
  locale: "en" | "fr";
  query: string;
  sectionBias?: "faq" | "vendor" | "policy" | "troubleshooting";
  chosenArticleId?: string;
  chosenChunkId?: string;
  helpful?: boolean;          // true = up, false = down
  clicked?: boolean;
  dwellMs?: number;
  overrideText?: string;
  overrideAuthor?: string;
  requestId?: string;
  client?: string;
}

export interface KBFeedbackOut {
  ok: true;
  id: string;
  receivedAt: string;
}

// Learning Insights Types
export interface KBGap {
  query: string;
  locale: string;
  n: number;
  helpfulRate: number;
  lastSeen: string;
}

export interface KBArticleNeedingLove {
  id: string;
  title: string;
  section: string;
  locale: string;
  feedbackCount: number;
  helpfulRate: number;
}

export interface KBHighSignalOverride {
  id: string;
  query: string;
  locale: string;
  overrideText: string;
  overrideAuthor?: string;
  articleTitle?: string;
  articleSection?: string;
  createdAt: string;
}

// Enhanced Search Result with chunking support
export interface KBSearchResultWithChunk extends KBSearchResult {
  chunkId?: string;
  section: Section;
  locale: Locale;
}

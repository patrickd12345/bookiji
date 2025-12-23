# Bookiji Support Module Architecture

## Overview
This module provides an automated, RAG-powered support system for Bookiji. It crawls public documentation, indexes it into a vector database, and uses a lightweight LLM to answer user queries.

## Goals
1.  **Automated Knowledge Base:** Weekly crawling of public pages.
2.  **Cost Efficiency:** Idempotent crawling (only re-index changed pages) and low-cost LLM (GPT-4o-mini or Gemini Flash).
3.  **Integrated Experience:** Seamless chat UI within the Bookiji app.

## Tech Stack

### Backend
-   **Runtime:** Node.js / Next.js API Routes
-   **Database:** Supabase (PostgreSQL)
-   **Vector Store:** `pgvector` (via Supabase)
-   **Crawler:** TypeScript script using `cheerio` and `node-fetch`.
-   **LLM Client:** Provider abstraction supporting OpenAI (GPT-4o-mini) or Google Gemini (1.5 Flash).

### Frontend
-   **Framework:** React (Next.js App Router)
-   **UI Components:** Radix UI (Dialog/Popover) + Tailwind CSS.
-   **State:** Local state or Zustand.

## Database Schema

We leverage the existing `kb_*` tables with minor modifications for the crawler.

### `kb_articles`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `url` | Text | Source URL (Unique) |
| `title` | Text | Page Title |
| `content_hash` | Text | SHA-256 hash of raw content (For idempotency) |
| `last_crawled_at` | Timestamptz | When it was last processed |
| ... | ... | Existing columns (locale, section) |

### `kb_article_chunks`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `article_id` | UUID | FK to `kb_articles` |
| `chunk_index` | Int | Order |
| `content` | Text | The actual text chunk |

### `kb_embeddings`
| Column | Type | Description |
| :--- | :--- | :--- |
| `chunk_id` | UUID | FK to `kb_article_chunks` |
| `embedding` | Vector(1536) | OpenAI/Gemini embedding |

## Data Flow

### 1. Ingestion (Crawler)
**Frequency:** Weekly (via GitHub Actions/Cron).
**Process:**
1.  Fetch `sitemap.xml` or start from `HOME` and crawl links.
2.  Filter: Allow public paths, Ignore `/admin`, `/login`, `/api`.
3.  For each page:
    *   Fetch HTML.
    *   Clean & Extract Text (Title + Body).
    *   Compute SHA-256 Hash.
    *   **Check DB:** If `url` exists and `content_hash` matches -> SKIP.
    *   **Update:**
        *   Update `kb_articles` (Hash, Content, Timestamp).
        *   Chunk text (e.g., 500-1000 tokens).
        *   Generate Embeddings (Batch API call).
        *   Delete old chunks/embeddings for this Article ID.
        *   Insert new chunks & embeddings.

### 2. Retrieval & Generation (RAG API)
**Endpoint:** `POST /api/support/ask`
**Process:**
1.  **Input:** User query.
2.  **Embed:** Generate vector for query.
3.  **Search:** Query `kb_embeddings` using cosine similarity (`<=>`).
    *   Retrieve top 5 chunks.
4.  **Context Construction:** Concatenate chunks.
5.  **LLM Call:**
    *   System Prompt: "You are Bookiji Support..."
    *   User Prompt: Context + Question.
6.  **Response:** Stream or return JSON with answer and source URLs.

## Security & Constraints
-   **API Keys:** Stored in `.env` (`OPENAI_API_KEY` or `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
-   **LLM Provider:** Configurable via `SUPPORT_LLM_PROVIDER` (default: `openai`, alternative: `gemini`).
-   **Rate Limiting:** Crawler respects standard politeness (1 request/sec).
-   **Content:** Only public, non-authenticated content is indexed.


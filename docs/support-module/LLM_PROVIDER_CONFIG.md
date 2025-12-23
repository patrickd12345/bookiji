# LLM Provider Configuration

## Why Multiple Providers?

The Support Module supports **4 providers** to maximize flexibility and cost savings:

1. **Gemini 1.5 Flash** - FREE tier, ~$0.07/1M tokens (Recommended)
2. **Groq** - FREE tier, extremely fast inference
3. **DeepSeek** - Very low cost
4. **OpenAI** - Reliable, widely used (more expensive)

## Architecture

**Important:** Embeddings and generation use separate providers:
- **Embeddings:** OpenAI or Gemini (they have embedding APIs)
- **Generation:** Any of the 4 providers (OpenAI, Gemini, Groq, DeepSeek)

This allows you to use free/cheap providers for generation while keeping high-quality embeddings.

## Configuration

### Option 1: Gemini 1.5 Flash (Recommended - FREE Tier)

```bash
SUPPORT_LLM_PROVIDER=gemini
SUPPORT_EMBEDDING_PROVIDER=openai  # or gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
```

**Pros:**
- ✅ **FREE tier** (60 requests/minute)
- ✅ Very cheap (~$0.07/1M tokens)
- ✅ Good quality for RAG
- ✅ Fast inference

**Cons:**
- Embeddings are 768 dims (padded to 1536)

### Option 2: Groq (FREE Tier - Fastest)

```bash
SUPPORT_LLM_PROVIDER=groq
SUPPORT_EMBEDDING_PROVIDER=openai
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant
```

**Pros:**
- ✅ **FREE tier available**
- ✅ **Extremely fast** inference (optimized hardware)
- ✅ Good quality with Llama models

**Cons:**
- No embedding API (must use OpenAI/Gemini for embeddings)

### Option 3: DeepSeek (Low Cost)

```bash
SUPPORT_LLM_PROVIDER=deepseek
SUPPORT_EMBEDDING_PROVIDER=openai
DEEPSEEK_API_KEY=...
DEEPSEEK_MODEL=deepseek-chat
```

**Pros:**
- ✅ Very low cost
- ✅ OpenAI-compatible API
- ✅ Good quality

**Cons:**
- No free tier
- No embedding API (must use OpenAI/Gemini)

### Option 4: OpenAI (Reliable but Paid)

```bash
SUPPORT_LLM_PROVIDER=openai
SUPPORT_EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

**Pros:**
- ✅ Widely used, stable
- ✅ Best embedding quality (1536 dims)
- ✅ Fast response times

**Cons:**
- ❌ More expensive
- ❌ No free tier

## Embedding vs Generation

**Embeddings** (for vector search):
- **OpenAI:** `text-embedding-3-small` (1536 dimensions) ✅ **Recommended**
- **Gemini:** `text-embedding-004` (768 dimensions, auto-padded to 1536)
- ❌ **Groq:** No embedding API available
- ❌ **DeepSeek:** No embedding API available

**Generation** (for answering questions):
- Can use any provider: OpenAI, Gemini, Groq, or DeepSeek
- Configure separately via `SUPPORT_LLM_PROVIDER`

⚠️ **Important Notes:**
- **Groq and DeepSeek don't offer embedding APIs** - you must use OpenAI or Gemini for embeddings
- Database schema uses `vector(1536)` optimized for OpenAI
- Gemini embeddings are automatically padded to 1536 dimensions
- **You can mix providers:** e.g., OpenAI embeddings + Groq generation (free!)
- This is actually optimal: quality embeddings (one-time cost) + free generation (every query)

## Switching Providers

1. Update `.env`:
   ```bash
   SUPPORT_LLM_PROVIDER=gemini  # or openai
   GEMINI_API_KEY=your_key
   ```

2. Re-run crawler to re-embed with new provider:
   ```bash
   pnpm tsx scripts/crawl-kb.ts
   ```

3. Test the RAG API to verify it works

## Cost Comparison (Approximate)

| Provider | Embedding | Generation | Free Tier | Speed |
|----------|-----------|------------|-----------|-------|
| **Gemini 1.5 Flash** | Free (Gemini) | ~$0.07/1M tokens | ✅ Yes (60/min) | Fast |
| **Groq** | N/A (use OpenAI) | Free tier | ✅ Yes | ⚡ Fastest |
| **DeepSeek** | N/A (use OpenAI) | ~$0.14/1M tokens | ❌ No | Fast |
| **OpenAI GPT-4o-mini** | $0.02/1M tokens | $0.15/1M tokens | ❌ No | Fast |

## Recommended Configurations

### 🏆 Best for Cost (FREE)
```bash
SUPPORT_LLM_PROVIDER=groq          # Free, fastest
SUPPORT_EMBEDDING_PROVIDER=openai  # Quality embeddings
GROQ_API_KEY=your_key
OPENAI_API_KEY=your_key
```

### 💰 Best Value (Almost Free)
```bash
SUPPORT_LLM_PROVIDER=gemini        # Free tier, very cheap
SUPPORT_EMBEDDING_PROVIDER=openai   # Quality embeddings
GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key
```

### 🎯 Best Quality (Paid)
```bash
SUPPORT_LLM_PROVIDER=openai
SUPPORT_EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_key
```

**Recommendation:** Start with **Groq + OpenAI embeddings** for completely free generation with quality embeddings!


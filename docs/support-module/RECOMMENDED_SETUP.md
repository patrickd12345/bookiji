# Recommended Support Module Setup

## 🎉 Completely Free Option: Gemini + Groq

### Best for Zero Cost

```bash
SUPPORT_LLM_PROVIDER=groq          # Free generation, fastest
SUPPORT_EMBEDDING_PROVIDER=gemini  # Free embeddings

GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
```

**Cost: $0.00/month** - Both providers have generous free tiers!

**Pros:**
- ✅ Completely free
- ✅ Fast generation (Groq)
- ✅ Free embeddings (Gemini)
- ✅ No credit card needed

**Cons:**
- ⚠️ Gemini embeddings are 768 dims (padded to 1536) - slightly lower quality than OpenAI
- ⚠️ Free tier rate limits (usually sufficient for small-medium sites)

---

## 🏆 Best Quality Option: Groq + OpenAI

### Why Not Groq for Both?

**Groq doesn't have an embedding API.** They only offer generation models (LLMs like Llama). That's why we use:
- **Groq** for generation (free, fast)
- **OpenAI/Gemini** for embeddings (they have embedding APIs)

### Why This Wins

1. **Free Generation:** Groq has a generous free tier - you'll likely never pay for answer generation
2. **Quality Embeddings:** OpenAI embeddings give better search results (one-time cost during crawl)
3. **Fastest Inference:** Groq is optimized for speed
4. **Cost:** ~$0.01/month (just embedding costs during weekly crawl)

### Setup

```bash
# .env or .env.local
SUPPORT_LLM_PROVIDER=groq
SUPPORT_EMBEDDING_PROVIDER=openai

# Required keys
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Cost Breakdown

**Monthly costs for typical usage (1000 queries):**
- Embeddings (weekly crawl): ~$0.01
- Generation (Groq free tier): **$0.00**
- **Total: ~$0.01/month** 🎉

### Alternative: Gemini + OpenAI

If Groq free tier limits are a concern:

```bash
SUPPORT_LLM_PROVIDER=gemini
SUPPORT_EMBEDDING_PROVIDER=openai

GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```

**Cost:** Similar (~$0.01/month), but Gemini has 60 req/min free tier limit.

## 🚀 Quick Start

### Option 1: Completely Free (Recommended for Testing)

1. **Get API Keys:**
   - Groq: https://console.groq.com/ (free tier)
   - Gemini: https://aistudio.google.com/app/apikey (free tier)

2. **Add to `.env`:**
   ```bash
   SUPPORT_LLM_PROVIDER=groq
   SUPPORT_EMBEDDING_PROVIDER=gemini
   GROQ_API_KEY=gsk_...
   GEMINI_API_KEY=...
   ```

3. **Run initial crawl:**
   ```bash
   pnpm tsx scripts/crawl-kb.ts
   ```

4. **Done!** Your support bot runs completely free!

### Option 2: Best Quality (Recommended for Production)

1. **Get API Keys:**
   - Groq: https://console.groq.com/ (free tier)
   - OpenAI: https://platform.openai.com/api-keys

2. **Add to `.env`:**
   ```bash
   SUPPORT_LLM_PROVIDER=groq
   SUPPORT_EMBEDDING_PROVIDER=openai
   GROQ_API_KEY=gsk_...
   OPENAI_API_KEY=sk-...
   ```

3. **Run initial crawl:**
   ```bash
   pnpm tsx scripts/crawl-kb.ts
   ```

4. **Done!** Your support bot runs for ~$0.01/month.

## 📊 Why Not Others?

- **OpenAI only:** 10-15x more expensive
- **Gemini only:** Slightly more expensive than Groq, similar free tier
- **DeepSeek:** No free tier, but cheaper than OpenAI if you need paid

## ✅ Final Recommendation

### For Testing/Development:
**Start with Gemini + Groq** - Completely free, no credit card needed!

### For Production:
**Use Groq + OpenAI** - Best quality embeddings + free generation = ~$0.01/month

### Cost Comparison

| Setup | Embeddings | Generation | Monthly Cost |
|-------|-----------|------------|--------------|
| **Gemini + Groq** | Free | Free | **$0.00** 🎉 |
| **OpenAI + Groq** | ~$0.01 | Free | **~$0.01** |
| **OpenAI only** | ~$0.01 | ~$0.15 | **~$0.16** |

**Recommendation:** Start free (Gemini + Groq), upgrade to OpenAI embeddings if you need better search quality.


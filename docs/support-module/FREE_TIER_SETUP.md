# Completely Free Setup: Gemini + Groq

## 🎉 Zero Cost Configuration

This setup uses **100% free tiers** from both providers:

- **Gemini** - Free embeddings (generous free tier)
- **Groq** - Free generation (generous free tier)

**Total Cost: $0.00/month** ✅

## Quick Setup

### 1. Get API Keys (Both Free)

**Gemini:**
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy your key

**Groq:**
1. Go to https://console.groq.com/
2. Sign up (free)
3. Go to API Keys section
4. Create a new key
5. Copy your key

### 2. Configure `.env`

```bash
# Use Gemini for embeddings (free)
SUPPORT_EMBEDDING_PROVIDER=gemini

# Use Groq for generation (free, fastest)
SUPPORT_LLM_PROVIDER=groq

# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Run Initial Crawl

```bash
pnpm tsx scripts/crawl-kb.ts
```

### 4. Done! 🎉

Your support bot is now running completely free!

## Free Tier Limits

### Gemini Free Tier
- **Embeddings:** Generous free tier (usually 15 requests/minute)
- **Generation:** 60 requests/minute
- **No credit card required**

### Groq Free Tier
- **Generation:** Very generous (varies by model)
- **Speed:** Extremely fast inference
- **No credit card required**

## When to Upgrade

Consider upgrading to **OpenAI embeddings** if:
- You need better search quality (1536 dims vs 768 dims)
- You're hitting Gemini rate limits
- You want maximum reliability

**Upgrade cost:** ~$0.01/month (just embedding costs during crawl)

## Cost Breakdown

**Monthly costs for typical usage (1000 queries):**
- Embeddings (Gemini): **$0.00** (free tier)
- Generation (Groq): **$0.00** (free tier)
- **Total: $0.00/month** 🎉

## Comparison

| Feature | Gemini + Groq | OpenAI + Groq |
|---------|---------------|---------------|
| **Cost** | $0.00/month | ~$0.01/month |
| **Embedding Quality** | Good (768 dims) | Best (1536 dims) |
| **Generation Speed** | Fast (Groq) | Fast (Groq) |
| **Free Tier** | ✅ Both | ✅ Groq only |
| **Best For** | Testing, small sites | Production, large sites |

## Recommendation

**Start with Gemini + Groq** (completely free), then upgrade to OpenAI embeddings if you need better search quality. Generation stays free with Groq either way!












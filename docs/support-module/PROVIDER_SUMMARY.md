# LLM Provider Support Summary

## ✅ What's Implemented

The Support Module now supports **4 providers** for maximum flexibility and cost savings:

### Generation Providers (Answer Questions)
1. **Gemini 1.5 Flash** - FREE tier, ~$0.07/1M tokens ⭐ **Recommended**
2. **Groq** - FREE tier, extremely fast ⚡ **Fastest**
3. **DeepSeek** - Low cost alternative
4. **OpenAI GPT-4o-mini** - Reliable, more expensive

### Embedding Providers (Vector Search)
1. **OpenAI** - `text-embedding-3-small` (1536 dims) ✅ **Recommended**
2. **Gemini** - `text-embedding-004` (768 dims, auto-padded)
3. ❌ **Groq** - No embedding API (generation only)
4. ❌ **DeepSeek** - No embedding API (generation only)

## 🎯 Key Insight

**You can mix providers!**

- Use **OpenAI** for quality embeddings (one-time cost during crawl)
- Use **Groq** or **Gemini** for free generation (every query)

Example config:
```bash
SUPPORT_LLM_PROVIDER=groq          # Free generation
SUPPORT_EMBEDDING_PROVIDER=openai  # Quality embeddings
```

This gives you:
- ✅ Quality vector search (OpenAI embeddings)
- ✅ Free answer generation (Groq)
- ✅ Best of both worlds!

## 💰 Cost Breakdown

**Scenario: 1000 support queries/month**

| Config | Embedding Cost | Generation Cost | Total |
|--------|---------------|-----------------|-------|
| Groq + OpenAI | ~$0.01 | **$0** (free tier) | **~$0.01** |
| Gemini + OpenAI | ~$0.01 | **$0** (free tier) | **~$0.01** |
| OpenAI only | ~$0.01 | ~$0.15 | ~$0.16 |

**Savings:** 94% cost reduction by using free generation providers!

## 🚀 Quick Start

### Option 1: Completely Free (Recommended)
```bash
SUPPORT_LLM_PROVIDER=groq
SUPPORT_EMBEDDING_PROVIDER=openai
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key  # Only for embeddings
```

### Option 2: Almost Free
```bash
SUPPORT_LLM_PROVIDER=gemini
SUPPORT_EMBEDDING_PROVIDER=openai
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key  # Only for embeddings
```

## 📝 Why This Architecture?

1. **Embeddings are one-time:** Generated during crawl, stored in DB
2. **Generation is per-query:** This is where costs add up
3. **Mix & Match:** Use best embeddings + cheapest generation

Result: **Near-zero operational costs** for the support module!


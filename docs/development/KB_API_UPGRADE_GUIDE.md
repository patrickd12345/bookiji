# KB API Upgrade Guide: Mock → Self-Improving pgvector

This guide walks you through upgrading your KB API from the mock provider to a production-ready, **self-improving** pgvector implementation that learns from every interaction.

## 🎯 **Current State vs. Future State**

| Feature | Mock Provider | Self-Improving pgvector |
|---------|---------------|-------------------------|
| **Data Source** | Hardcoded arrays | PostgreSQL + vector embeddings |
| **Search** | Simple text matching | Semantic similarity search |
| **Performance** | Instant (in-memory) | Fast (indexed vectors) |
| **Scalability** | Limited to ~10 articles | Millions of articles |
| **Accuracy** | Basic keyword matching | AI-powered semantic understanding |
| **Learning** | ❌ Static | ✅ **Self-improving** |
| **Feedback Loop** | ❌ None | ✅ **User signals + agent overrides** |
| **Gap Detection** | ❌ Manual | ✅ **Automatic + insights** |

## 🚀 **Upgrade Path (3 Phases)**

### **Phase 1: Foundation (Deploy Today)**
```bash
# 1. Deploy the enhanced database schema
supabase db push

# 2. Deploy the indexing Edge Function
supabase functions deploy kb-index

# 3. Set environment variables
supabase secrets set SUPABASE_URL=your-project-url
supabase secrets set SUPABASE_SECRET_KEY=your-secret-key
supabase secrets set OPENAI_API_KEY=your-openai-api-key
```

### **Phase 2: Vector Search (Deploy Tomorrow)**
```bash
# 1. Switch to pgvector provider
# Edit src/lib/kb/provider.ts:
export const Kb = createPgVectorProvider();

# 2. Test semantic search
curl -H "X-API-Key: $KB_API_KEY" \
  "https://api.bookiji.com/api/kb/search?q=payment+issues"
```

### **Phase 3: Learning Loops (Deploy Next Week)**
```bash
# 1. Start collecting feedback
# Your GPT Actions now call /api/kb/feedback

# 2. Monitor insights
curl -H "X-API-Key: $KB_API_KEY" \
  "https://api.bookiji.com/api/kb/insights?type=gaps"

# 3. Promote overrides to articles
# Use the insights API to find high-signal content
```

## 🔄 **How the Self-Improving Loop Works**

### **1. User Interaction → Feedback**
```
User asks question → GPT provides answer → User gives thumbs up/down
                                                    ↓
                                            /api/kb/feedback
                                                    ↓
                                            kb_feedback table
```

### **2. Agent Overrides → Knowledge**
```
Agent sees poor answer → Provides better answer → Override captured
                                                          ↓
                                                  kb_feedback table
                                                          ↓
                                                  High-signal content
```

### **3. Automatic Learning → Better Answers**
```
New articles created → Edge Function chunks + embeds → Vector index updated
                                                              ↓
                                                      Next search is smarter
```

### **4. Gap Detection → Content Strategy**
```
Low helpful rates → Insights API surfaces gaps → Editors create new articles
                                                          ↓
                                                  kb_articles table
                                                          ↓
                                                  Automatic indexing
```

## 📊 **New API Endpoints**

### **Feedback Collection**
```typescript
// POST /api/kb/feedback
await fetch('/api/kb/feedback', {
  method: 'POST',
  headers: { 'X-API-Key': API_KEY },
  body: JSON.stringify({
    locale: 'en',
    query: 'How do I connect my calendar?',
    helpful: true,
    clicked: true,
    client: 'chatgpt_action'
  })
});
```

### **Learning Insights**
```typescript
// GET /api/kb/insights?type=gaps
const gaps = await fetch('/api/kb/insights?type=gaps', {
  headers: { 'X-API-Key': API_KEY }
});

// GET /api/kb/insights?type=overrides
const overrides = await fetch('/api/kb/insights?type=overrides', {
  headers: { 'X-API-Key': API_KEY }
});
```

## 🛠 **Database Schema Changes**

### **New Tables**
- `kb_article_chunks` - Article content split into searchable chunks
- `kb_embeddings` - Vector embeddings for semantic search
- `kb_feedback` - User interactions and agent overrides

### **New Views**
- `kb_feedback_daily` - Daily feedback rollups
- `kb_gaps` - Queries with low helpful rates
- `kb_articles_needing_love` - Articles with poor performance
- `kb_high_signal_overrides` - Agent overrides ready for promotion

### **New Functions**
- `kb_search()` - Vector similarity search with chunking
- `kb_hybrid_search()` - Vector + keyword hybrid search

## 🔧 **Edge Function: Automatic Indexing**

The `kb-index` Edge Function automatically:
1. **Chunks** articles into ~800 character segments
2. **Generates** OpenAI embeddings for each chunk
3. **Stores** chunks and embeddings in the database
4. **Triggers** on every article insert/update

### **Deployment**
```bash
# Deploy the function
supabase functions deploy kb-index

# Test with a sample article
curl -X POST https://your-project.functions.supabase.co/kb-index \
  -H "Content-Type: application/json" \
  -d '{"article_id": "your-article-uuid", "action": "create"}'
```

## 📈 **Monitoring & Analytics**

### **Daily Metrics**
- Total feedback events
- Helpful rate by section/locale
- Click-through rates
- Average dwell time

### **Gap Analysis**
- Queries with <40% helpful rate
- Articles with <50% helpful rate
- High-signal agent overrides

### **Performance Tracking**
- Search result quality scores
- Response time improvements
- User satisfaction trends

## 🚨 **Production Checklist**

### **Before Go-Live**
- [ ] Database migrations deployed
- [ ] Edge Function deployed and tested
- [ ] Environment variables configured
- [ ] Rate limits adjusted for feedback volume
- [ ] Monitoring dashboards set up

### **After Go-Live**
- [ ] Monitor feedback collection rates
- [ ] Review daily insights reports
- [ ] Promote high-signal overrides to articles
- [ ] Address identified content gaps
- [ ] Track helpful rate improvements

## 🔮 **Future Enhancements**

### **Hybrid Search**
- Combine vector similarity + BM25 keyword search
- Reciprocal rank fusion for better results
- Section-aware reranking

### **Advanced Learning**
- A/B testing different answer strategies
- Personalized content recommendations
- Multi-language content generation

### **Quality Assurance**
- Automated content quality scoring
- Plagiarism detection
- Fact-checking integration

## 💡 **Pro Tips**

1. **Start Small**: Begin with feedback collection, then add vector search
2. **Monitor Closely**: Watch helpful rates and address gaps quickly
3. **Agent Training**: Teach support agents to use overrides effectively
4. **Content Strategy**: Use insights to guide your content creation roadmap
5. **Iterate Fast**: The system learns from every interaction - make it count!

## 🎉 **You're Now Running a Living KB!**

Your knowledge base is no longer static - it's a living, breathing system that:
- **Learns** from every user interaction
- **Improves** with every agent override  
- **Grows** with every resolved case
- **Adapts** to changing user needs

Welcome to the future of support! 🚀
